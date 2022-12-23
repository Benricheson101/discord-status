use std::env;

use chrono::{DateTime, Utc};
use reqwest::Client as ReqwestClient;
use serde::{Deserialize, Serialize};

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

#[derive(Clone)]
pub struct StatuspageAPI {
    reqwest_client: ReqwestClient,
    statuspage_api_url: String,
}

impl StatuspageAPI {
    pub fn new() -> Self {
        let reqwest_client = ReqwestClient::new();

        Self {
            reqwest_client,
            statuspage_api_url: env::var("STATUSPAGE_API_URL")
                .expect("Missing `STATUSPAGE_API_URL` in env"),
        }
    }

    pub async fn get_all_incidents(&self) -> reqwest::Result<Incidents> {
        // TODO: can i do this without the clone?
        let url = self.statuspage_api_url.clone() + "/incidents.json";

        self.reqwest_client
            .get(url)
            .send()
            .await?
            .json::<Incidents>()
            .await
    }
}
