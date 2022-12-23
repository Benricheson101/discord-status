use chrono::{DateTime, Utc};

use crate::{constants::*, statuspage::IncidentStatus};

pub fn get_embed_color(status: &IncidentStatus) -> u32 {
    use IncidentStatus::*;

    match status {
        Investigating => EMBED_ORANGE,
        Identified => EMBED_RED,
        Monitoring => EMBED_YELLOW,
        Resolved => EMBED_GREEN,
        Postmortem => EMBED_BLUE,
    }
}

pub fn get_status_emoji(status: &IncidentStatus) -> &'static str {
    use IncidentStatus::*;

    match status {
        Investigating => EMOJI_ORANGE,
        Identified => EMOJI_RED,
        Monitoring => EMOJI_YELLOW,
        Resolved => EMOJI_GREEN,
        Postmortem => EMOJI_BLUE,
    }
}

pub fn get_formatted_timestamp(time: &DateTime<Utc>) -> String {
    format!("<t:{}:R>", time.timestamp())
}
