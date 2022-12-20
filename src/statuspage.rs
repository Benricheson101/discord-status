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
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Identified,
    Investigating,
    Monitoring,
    Resolved,
    PostMortem,
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

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct StatusPageAPIIncidents {
//     pub page: Page,
//     pub incidents: Vec<Incident>,
// }

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct Page {
//     pub id: String,
//     pub name: String,
//     pub url: String,
//     #[serde(rename = "time_zone")]
//     pub time_zone: String,
//     #[serde(rename = "updated_at")]
//     pub updated_at: String,
// }

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct Incident {
//     pub id: String,
//     pub name: String,
//     pub status: String,
//     #[serde(rename = "created_at")]
//     pub created_at: String,
//     #[serde(rename = "updated_at")]
//     pub updated_at: String,
//     #[serde(rename = "monitoring_at")]
//     pub monitoring_at: Option<String>,
//     #[serde(rename = "resolved_at")]
//     pub resolved_at: Option<String>,
//     pub impact: String,
//     pub shortlink: String,
//     #[serde(rename = "started_at")]
//     pub started_at: String,
//     #[serde(rename = "page_id")]
//     pub page_id: String,
//     #[serde(rename = "incident_updates")]
//     pub incident_updates: Vec<IncidentUpdate>,
//     pub components: Vec<Component>,
// }

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct IncidentUpdate {
//     pub id: String,
//     pub status: String,
//     pub body: String,
//     #[serde(rename = "incident_id")]
//     pub incident_id: String,
//     #[serde(rename = "created_at")]
//     pub created_at: String,
//     #[serde(rename = "updated_at")]
//     pub updated_at: String,
//     #[serde(rename = "display_at")]
//     pub display_at: String,
//     #[serde(rename = "affected_components")]
//     #[serde(default)]
//     pub affected_components: Vec<AffectedComponent>,
//     #[serde(rename = "deliver_notifications")]
//     pub deliver_notifications: bool,
//     #[serde(rename = "custom_tweet")]
//     pub custom_tweet: Value,
//     #[serde(rename = "tweet_id")]
//     pub tweet_id: Value,
// }

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct AffectedComponent {
//     pub code: String,
//     pub name: String,
//     #[serde(rename = "old_status")]
//     pub old_status: String,
//     #[serde(rename = "new_status")]
//     pub new_status: String,
// }

// #[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct Component {
//     pub id: String,
//     pub name: String,
//     pub status: String,
//     #[serde(rename = "created_at")]
//     pub created_at: String,
//     #[serde(rename = "updated_at")]
//     pub updated_at: String,
//     pub position: i64,
//     pub description: Value,
//     pub showcase: bool,
//     #[serde(rename = "start_date")]
//     pub start_date: String,
//     #[serde(rename = "group_id")]
//     pub group_id: Value,
//     #[serde(rename = "page_id")]
//     pub page_id: String,
//     pub group: bool,
//     #[serde(rename = "only_show_if_degraded")]
//     pub only_show_if_degraded: bool,
// }
