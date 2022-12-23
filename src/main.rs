pub mod constants;
pub mod db;
pub mod embeds;
pub mod statuspage;
pub mod util;

use std::{
    env,
    error,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use embeds::{make_edit_embed, make_post_embed};
use futures::{future::join_all, Stream, StreamExt};
use sqlx::postgres::PgPoolOptions;
use statuspage::{Incident, IncidentUpdate};
use thiserror::Error;
use tokio::{
    sync::mpsc::{self, UnboundedReceiver, UnboundedSender},
    time,
};
use tracing::info;
use twilight_http::{
    response::DeserializeBodyError,
    Client as DiscordRestClient,
};
use twilight_model::{
    channel::message::{Embed, Message},
    id::Id,
};

use crate::{
    db::*,
    statuspage::{Incidents, StatuspageAPI},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn error::Error>> {
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

    while let Some(updates) = su.next().await {
        for update in &updates {
            match update {
                Update::Created(i) => {
                    let subs = db.get_incident_created_subscriptions().await?;
                    let futs = subs.into_iter().map(|s| {
                        let embed = match s.kind {
                            SubscriptionKind::Post => {
                                make_post_embed(i, &i.incident_updates[0])
                            },
                            SubscriptionKind::Edit => make_edit_embed(i),
                        };

                        println!("trying to send message to {}", &s.channel_id);

                        async {
                            (
                                create_message(
                                    &discord_rest_client,
                                    s.channel_id,
                                    embed,
                                )
                                .await,
                                s,
                            )
                        }
                    });

                    let j = join_all(futs).await;
                    let total = j.len();

                    // https://doc.rust-lang.org/rust-by-example/error/iter_result.html
                    let (success, fail): (Vec<_>, Vec<_>) =
                        j.into_iter().partition(|f| f.0.is_ok());
                    let success: Vec<_> = success
                        .into_iter()
                        .map(|s| (s.0.unwrap(), s.1))
                        .collect();
                    let fail: Vec<_> = fail
                        .into_iter()
                        .map(|f| (f.0.unwrap_err(), f.1))
                        .collect();

                    info!(
                        success = success.len(),
                        fail = fail.len(),
                        total = total,
                        "Sent incident created messages",
                    );

                    println!("{:#?}", fail);

                    for s in &success {
                        db.create_sent_update(CreateSentUpdate {
                            incident_id: &i.id,
                            incident_update_id: &i.incident_updates[0].id,
                            kind: s.1.kind,
                            message_id: s.0.id.get() as i64,
                            subscription_id: s.1.subscription_id,
                            legacy_subscription_id: s.1.legacy_subscription_id,
                        })
                        .await;
                    }

                    // TODO: do something with fails
                },

                Update::UpdateCreated(i, u) => {
                    let subs = db
                        .get_incident_update_created_subscriptions(&i.id)
                        .await?;

                    // cases:
                    //   - mode:edit and Some(message_id) -> edit message
                    //   - mode:edit and None(message_id) -> send new message
                    //   - mode:post and _ -> send update
                    //
                    //   - mode:post and Some(message_id) -> send 1 new message
                    //   - mode:post and None(message_id) -> send all update embeds

                    for s in &subs {
                        match (s.kind, s.message_id) {
                            (SubscriptionKind::Edit, Some(msg_id)) => {
                                let embed = make_edit_embed(i);
                                let msg = update_message(
                                    &discord_rest_client,
                                    s.channel_id,
                                    msg_id,
                                    embed,
                                )
                                .await?;
                                db.create_sent_update(CreateSentUpdate {
                                    message_id: msg.id.get() as i64,
                                    kind: s.kind,
                                    incident_id: &i.id,
                                    incident_update_id: &u.id,
                                    subscription_id: s.subscription_id,
                                    legacy_subscription_id: s
                                        .legacy_subscription_id,
                                })
                                .await;
                            },
                            (SubscriptionKind::Edit, None) => {
                                let embed = make_edit_embed(i);
                                let msg = create_message(
                                    &discord_rest_client,
                                    s.channel_id,
                                    embed,
                                )
                                .await?;
                                db.create_sent_update(CreateSentUpdate {
                                    message_id: msg.id.get() as i64,
                                    kind: s.kind,
                                    incident_id: &i.id,
                                    incident_update_id: &u.id,
                                    subscription_id: s.subscription_id,
                                    legacy_subscription_id: s
                                        .legacy_subscription_id,
                                })
                                .await;
                            },
                            (SubscriptionKind::Post, _) => {
                                let embed = make_post_embed(i, u);
                                let msg = create_message(
                                    &discord_rest_client,
                                    s.channel_id,
                                    embed,
                                )
                                .await?;
                                db.create_sent_update(CreateSentUpdate {
                                    message_id: msg.id.get() as i64,
                                    kind: s.kind,
                                    incident_id: &i.id,
                                    incident_update_id: &u.id,
                                    subscription_id: s.subscription_id,
                                    legacy_subscription_id: s
                                        .legacy_subscription_id,
                                })
                                .await;
                            },
                        }
                    }

                    // cid, kind
                    // LEFT JOIN wid, wtoken
                    // LEFT JOIN mid

                    // queries:
                    //     - if post: channel_id,webhook_id,webhook_token,kind
                    //     - if edit:
                    //         - if previously sent message:
                    //           channel_id,message_id,webhook_id,webhook_token,kind
                    //         - else: channel_id,webhook_id,webhook_token,kind
                },

                Update::UpdateModified(i, (_u_old, u_new)) => {
                    let subs = db
                        .get_incident_update_modified_subscriptions(
                            &i.id, &u_new.id,
                        )
                        .await?;

                    println!("{:#?}", &subs);

                    for sub in &subs {
                        let embed = match sub.kind {
                            SubscriptionKind::Post => make_post_embed(i, u_new),
                            SubscriptionKind::Edit => make_edit_embed(i),
                        };

                        update_message(
                            &discord_rest_client,
                            sub.channel_id,
                            sub.message_id,
                            embed,
                        )
                        .await?;
                    }

                    // cid, kind
                    // LEFT JOIN wid, wtoken
                    // INNER JOIN mid

                    // queries:
                    //     - if sub AND message already posted:
                    //       channel_id,message_id,webhook_id,webhook_token,kind
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
) -> Result<Message, DiscordStatusError> {
    rest_client
        .create_message(Id::new(channel_id as u64))
        .embeds(&[embed])
        .unwrap()
        .await?
        .model()
        .await
        .map_err(|e| e.into())
}

async fn update_message(
    rest_client: &DiscordRestClient,
    channel_id: i64,
    message_id: i64,
    embed: Embed,
) -> Result<Message, DiscordStatusError> {
    rest_client
        .update_message(Id::new(channel_id as u64), Id::new(message_id as u64))
        .embeds(Some(&[embed]))
        .unwrap()
        .await?
        .model()
        .await
        .map_err(|e| e.into())
}

// TODO: more specific errors
#[derive(Debug, Error)]
pub enum DiscordStatusError {
    #[error("http request failed: {:?}", .source)]
    TwilightHTTPError {
        #[from]
        source: twilight_http::Error,
    },
    #[error("failed to deserialize response body")]
    DeserializeBodyError {
        #[from]
        source: DeserializeBodyError,
    },
}

fn cmp_incidents(
    old_incidents: &Incidents,
    new_incidents: &Incidents,
) -> Vec<Update> {
    let mut updated_incidents = vec![];

    // TODO: deleted incidents?

    for incident in &new_incidents.incidents {
        match old_incidents.incidents.iter().find(|i| i.id == incident.id) {
            Some(i) => {
                if i.status == incident.status
                    && i.updated_at == incident.updated_at
                    && i.incident_updates.len()
                        == incident.incident_updates.len()
                {
                    continue;
                }

                for update in &incident.incident_updates {
                    match i.incident_updates.iter().find(|u| u.id == update.id)
                    {
                        Some(u) => {
                            if update.status != u.status
                                || update.body != u.body
                                || update.updated_at != u.updated_at
                            // TODO: affected_components?
                            {
                                info!(
                                    incident_id = &incident.id,
                                    update_id = &update.id,
                                    "An incident was modified",
                                );
                                updated_incidents.push(Update::UpdateModified(
                                    incident.clone(),
                                    (u.clone(), update.clone()),
                                ));
                                // continue 'incidents;
                            }
                        },

                        None => {
                            info!(
                                incident_id = &incident.id,
                                update_id = &update.id,
                                "New incident update found",
                            );

                            updated_incidents.push(Update::UpdateCreated(
                                incident.clone(),
                                update.clone(),
                            ));
                            // continue 'incidents;
                        },
                    }
                }
            },

            None => {
                let j = vec![new_incidents, old_incidents];
                let j = serde_json::to_string(&j).unwrap();
                println!("{}", j);
                info!(id = &incident.id, "New incident found",);
                updated_incidents.push(Update::Created(incident.clone()));
            },
        }
    }

    updated_incidents
}

struct StatuspageUpdates {
    rx: UnboundedReceiver<Vec<Update>>,
}

impl StatuspageUpdates {
    pub fn new(statuspage_api: StatuspageAPI) -> (Self, StatuspageUpdatesPoll) {
        let (tx, rx) = mpsc::unbounded_channel();

        (Self { rx }, StatuspageUpdatesPoll { tx, statuspage_api })
    }
}

pub struct StatuspageUpdatesPoll {
    tx: UnboundedSender<Vec<Update>>,
    statuspage_api: StatuspageAPI,
}

impl StatuspageUpdatesPoll {
    pub fn new(
        tx: UnboundedSender<Vec<Update>>,
        statuspage_api: StatuspageAPI,
    ) -> Self {
        Self { tx, statuspage_api }
    }

    pub async fn start(&self) {
        let mut prev = self.statuspage_api.get_all_incidents().await.unwrap();

        let mut interval = time::interval(Duration::from_secs(5));

        // TODO: why does this sometimes get into a weird state where it loops infinitely?
        loop {
            interval.tick().await;
            let curr = self.statuspage_api.get_all_incidents().await.unwrap();
            let changes = cmp_incidents(&prev, &curr);

            println!("{:#?}", changes);

            if !changes.is_empty() {
                self.tx.send(changes).ok();
            }

            prev = curr;
        }
    }
}

impl Stream for StatuspageUpdates {
    type Item = Vec<Update>;

    fn poll_next(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        self.rx.poll_recv(cx)
    }
}

#[derive(Debug)]
pub enum Update {
    Created(Incident),
    // Deleted(String), // TODO: do i have a way to find this?
    UpdateCreated(Incident, IncidentUpdate),
    UpdateModified(Incident, (IncidentUpdate, IncidentUpdate)),
}
