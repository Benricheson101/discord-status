// pub mod config;
pub mod db;
pub mod statuspage;

use std::{
    env,
    error,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures::{Stream, StreamExt};
use sqlx::postgres::PgPoolOptions;
use statuspage::{Incident, IncidentUpdate};
use tokio::{
    sync::mpsc::{self, UnboundedReceiver, UnboundedSender},
    time,
};
use tracing::info;
use twilight_http::Client as DiscordRestClient;

use crate::statuspage::{Incidents, StatuspageAPI};

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

    let db = db::Database::new(pg_pool);

    let statuspage_api = StatuspageAPI::new();
    let (mut su, poll) = StatuspageUpdates::new(statuspage_api);

    tokio::spawn(async move {
        info!("Begin polling for updates");
        poll.start().await;
    });

    while let Some(updates) = su.next().await {
        println!("{:#?}", &updates);
    }

    Ok(())
}

fn cmp_incidents(
    old_incidents: &Incidents,
    new_incidents: &Incidents,
) -> Vec<Update> {
    let mut updated_incidents = vec![];

    // TODO: deleted incidents?

    for incident in new_incidents.incidents.iter() {
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
                                    update.clone(),
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

        let mut interval = time::interval(Duration::from_secs(10));
        loop {
            interval.tick().await;
            let curr = self.statuspage_api.get_all_incidents().await.unwrap();
            let changes = cmp_incidents(&prev, &curr);

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

#[derive(Debug, Clone)]
pub enum Update {
    Created(Incident),
    // Deleted(String), // TODO: do i have a way to find this?
    UpdateCreated(Incident, IncidentUpdate),
    UpdateModified(Incident, IncidentUpdate),
}
