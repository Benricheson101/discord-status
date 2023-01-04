use std::{
    env,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use chrono::{DateTime, Utc};
use futures::Stream;
use reqwest::Client as ReqwestClient;
use serde::{Deserialize, Serialize};
use tokio::{
    sync::{
        broadcast::Receiver,
        mpsc::{self, UnboundedReceiver, UnboundedSender},
    },
    time,
};
use tracing::info;
#[derive(Clone)]
pub struct StatuspageAPI {
    reqwest_client: ReqwestClient,
    pub statuspage_api_url: String,
}

impl StatuspageAPI {
    pub fn new() -> Self {
        let reqwest_client = ReqwestClient::new();

        Self {
            reqwest_client,
            statuspage_api_url: env::var("STATUSPAGE_URL")
                .expect("Missing `STATUSPAGE_URL` in env"),
        }
    }

    pub async fn get_all_incidents(&self) -> reqwest::Result<Incidents> {
        let url = format!("{}/api/v2/incidents.json", self.statuspage_api_url);

        self.reqwest_client
            .get(url)
            .send()
            .await?
            .json::<Incidents>()
            .await
    }
}

impl Default for StatuspageAPI {
    fn default() -> Self {
        Self::new()
    }
}

pub struct StatuspageUpdates {
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

    pub async fn start(&self, mut stop: Receiver<()>) {
        let mut prev = self.statuspage_api.get_all_incidents().await.unwrap();

        let mut interval = time::interval(Duration::from_secs(5));

        loop {
            let curr = self.statuspage_api.get_all_incidents().await.unwrap();
            let changes = self.cmp_incidents(&prev, &curr);

            if !changes.is_empty() {
                self.tx.send(changes).ok();
            }

            prev = curr;

            tokio::select! {
                _ = interval.tick() => {},
                _ = stop.recv() => {
                    info!("recvd stop signal");
                    break;
                }
            };
        }
    }

    fn cmp_incidents(
        &self,
        old_incidents: &Incidents,
        new_incidents: &Incidents,
    ) -> Vec<Update> {
        let mut updated_incidents = vec![];

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
                        match i
                            .incident_updates
                            .iter()
                            .find(|u| u.id == update.id)
                        {
                            Some(u) => {
                                if update.status != u.status
                                    || update.body != u.body
                                    || update.updated_at != u.updated_at
                                {
                                    info!(
                                        incident_id = &incident.id,
                                        update_id = &update.id,
                                        "An incident was modified",
                                    );
                                    updated_incidents.push(
                                        Update::UpdateModified(
                                            incident.clone(),
                                            (u.clone(), update.clone()),
                                        ),
                                    );
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

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Incidents {
    pub incidents: Vec<Incident>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Incident {
    pub id: String,
    pub name: String,
    pub shortlink: String,
    pub incident_updates: Vec<IncidentUpdate>,

    pub status: IncidentStatus,
    pub impact: StatusIndicator,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct IncidentUpdate {
    pub id: String,
    pub incident_id: String,
    pub status: IncidentStatus,
    pub body: String,
    pub affected_components: Option<Vec<AffectedComponent>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Identified,
    Investigating,
    Monitoring,
    Resolved,
    Postmortem,
}

impl ToString for IncidentStatus {
    fn to_string(&self) -> String {
        match self {
            Self::Identified => "Identified",
            Self::Investigating => "Investigating",
            Self::Monitoring => "Monitoring",
            Self::Resolved => "Resolved",
            Self::Postmortem => "Postmortem",
        }
        .to_string()
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum StatusIndicator {
    None,
    Minor,
    Major,
    Critical,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComponentStatus {
    Operational,
    DegradedPerformance,
    PartialOutage,
    MajorOutage,
    UnderMaintenance,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AffectedComponent {
    pub code: String,
    pub name: String,
    pub old_status: ComponentStatus,
    pub new_status: ComponentStatus,
}

pub struct Component {
    pub id: String,
    pub name: String,
    pub status: ComponentStatus,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
