pub mod constants;
pub mod db;
pub mod embeds;
pub mod error;
pub mod statuspage;
pub mod util;

use std::env;

use embeds::{make_edit_embed, make_post_embed};
use futures::{future::join_all, StreamExt};
use sqlx::postgres::PgPoolOptions;
use tracing::{info, warn};
use twilight_http::Client as DiscordRestClient;
use twilight_model::{
    channel::message::{Embed, Message},
    id::Id,
};

use crate::{
    db::*,
    error::ApplicationError,
    statuspage::{StatuspageAPI, StatuspageUpdates, Update},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    dotenv::dotenv().ok();

    let pg_url = env::var("DATABASE_URL")?;
    let discord_token = env::var("DISCORD_TOKEN")?;

    let pg_pool = PgPoolOptions::new().connect(pg_url.as_str()).await?;
    info!("Connected to PostgreSQL");

    let discord_rest_client = DiscordRestClient::new(discord_token);
    let current_user =
        discord_rest_client.current_user().await?.model().await?;

    info!(
        user =
            format!("{}#{}", current_user.name, current_user.discriminator()),
        id = current_user.id.get(),
        "Using Discord token for",
    );

    let db = Database::new(pg_pool);

    let statuspage_api = StatuspageAPI::new();
    let (mut su, poll) = StatuspageUpdates::new(statuspage_api);

    tokio::spawn(async move {
        info!("Begin polling for updates");
        poll.start().await;
    });

    // TODO: handle the errors in here
    while let Some(updates) = su.next().await {
        for update in &updates {
            match update {
                Update::Created(i) => {
                    let subs =
                        db.get_incident_created_subscriptions(&i.id).await?;

                    if subs.is_empty() {
                        warn!("Found new incident but no subscriptions left to send it to");
                        continue;
                    }

                    let futs = subs.into_iter().map(|s| async {
                        let embed = match s.kind {
                            SubscriptionKind::Post => {
                                make_post_embed(i, &i.incident_updates[0])
                            },
                            SubscriptionKind::Edit => make_edit_embed(i),
                        };

                        (
                            create_message(
                                &discord_rest_client,
                                s.channel_id,
                                embed,
                            )
                            .await,
                            s,
                        )
                    });

                    let j = join_all(futs).await;
                    let total = j.len();

                    // https://doc.rust-lang.org/rust-by-example/error/iter_result.html
                    let (success, fail): (Vec<_>, Vec<_>) =
                        j.into_iter().partition(|f| f.0.is_ok());

                    info!(
                        success = success.len(),
                        fail = fail.len(),
                        total = total,
                        "Sent incident created messages",
                    );

                    let success: Vec<_> = success
                        .into_iter()
                        .map(|(msg, sub)| {
                            let msg = msg.unwrap();

                            CreateSentUpdate {
                                kind: sub.kind,
                                message_id: msg.id.get() as i64,
                                incident_id: &i.id,
                                incident_update_id: &i.incident_updates[0].id,
                                subscription_id: sub.subscription_id,
                                legacy_subscription_id: sub
                                    .legacy_subscription_id,
                            }
                        })
                        .collect();

                    db.create_many_sent_updates(success).await?;
                },

                Update::UpdateCreated(i, u) => {
                    let subs = db
                        .get_incident_update_created_subscriptions(&i.id, &u.id)
                        .await?;

                    if subs.is_empty() {
                        warn!("Found new incident update but no subscriptions left to send it to");
                        continue;
                    }

                    let futs = subs.into_iter().map(|s| async {
                        match (s.kind, s.message_id) {
                            (SubscriptionKind::Edit, Some(msg_id)) => {
                                let embed = make_edit_embed(i);
                                (
                                    update_message(
                                        &discord_rest_client,
                                        s.channel_id,
                                        msg_id,
                                        embed,
                                    )
                                    .await,
                                    s,
                                )
                            },
                            (SubscriptionKind::Edit, None) => {
                                let embed = make_edit_embed(i);
                                (
                                    create_message(
                                        &discord_rest_client,
                                        s.channel_id,
                                        embed,
                                    )
                                    .await,
                                    s,
                                )
                            },
                            (SubscriptionKind::Post, _) => {
                                let embed = make_post_embed(i, u);
                                (
                                    create_message(
                                        &discord_rest_client,
                                        s.channel_id,
                                        embed,
                                    )
                                    .await,
                                    s,
                                )
                            },
                        }
                    });

                    let j = join_all(futs).await;
                    let total_len = j.len();

                    let (success, fail): (Vec<_>, Vec<_>) =
                        j.into_iter().partition(|f| f.0.is_ok());

                    info!(
                        success = success.len(),
                        fail = fail.len(),
                        total = total_len,
                        "Sent incident update created messages",
                    );
                    let success: Vec<_> = success
                        .into_iter()
                        .map(|(msg, sub)| {
                            let msg = msg.unwrap();

                            CreateSentUpdate {
                                kind: sub.kind,
                                message_id: msg.id.get() as i64,
                                incident_id: &i.id,
                                incident_update_id: &u.id,
                                subscription_id: sub.subscription_id,
                                legacy_subscription_id: sub
                                    .legacy_subscription_id,
                            }
                        })
                        .collect();

                    db.create_many_sent_updates(success).await?;
                },

                Update::UpdateModified(i, (_u_old, u_new)) => {
                    let subs = db
                        .get_incident_update_modified_subscriptions(
                            &i.id, &u_new.id,
                        )
                        .await?;

                    if subs.is_empty() {
                        continue;
                    }

                    let futs = subs.into_iter().map(|s| {
                        let embed = match s.kind {
                            SubscriptionKind::Post => make_post_embed(i, u_new),
                            SubscriptionKind::Edit => make_edit_embed(i),
                        };

                        update_message(
                            &discord_rest_client,
                            s.channel_id,
                            s.message_id,
                            embed,
                        )
                    });

                    let j = join_all(futs).await;

                    let (successes, fails) =
                        j.iter().fold((0, 0), |mut a, c| {
                            match c {
                                Ok(_) => a.0 += 1,
                                Err(_) => a.1 += 1,
                            };
                            a
                        });

                    info!(
                        success = successes,
                        fail = fails,
                        total = successes + fails,
                        "Edited incident update messages"
                    );
                },
            }
        }
    }

    Ok(())
}

async fn create_message(
    rest_client: &DiscordRestClient,
    channel_id: i64,
    embed: Embed,
) -> Result<Message, ApplicationError> {
    rest_client
        .create_message(Id::new(channel_id as u64))
        .embeds(&[embed])
        .unwrap()
        .await
        .map_err(|e| ApplicationError::MessageSendError {
            channel_id: channel_id as u64,
            error: e,
        })?
        .model()
        .await
        .map_err(|e| e.into())
}

async fn update_message(
    rest_client: &DiscordRestClient,
    channel_id: i64,
    message_id: i64,
    embed: Embed,
) -> Result<Message, ApplicationError> {
    rest_client
        .update_message(Id::new(channel_id as u64), Id::new(message_id as u64))
        .embeds(Some(&[embed]))
        .unwrap()
        .await
        .map_err(|e| ApplicationError::MessageEditError {
            channel_id: channel_id as u64,
            message_id: message_id as u64,
            error: e,
        })?
        .model()
        .await
        .map_err(|e| e.into())
}