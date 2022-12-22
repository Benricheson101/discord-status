use chrono::{DateTime, Utc};

use crate::statuspage::IncidentStatus;

const EMBED_RED: u32 = 0xF15832;
const EMBED_ORANGE: u32 = 0xED9932;
const EMBED_YELLOW: u32 = 0xF2EF42;
const EMBED_GREEN: u32 = 0x43B581;
const EMBED_BLUE: u32 = 0x4287F5;

const EMOJI_RED: &str = "<:statusred:797222239661457478>";
const EMOJI_ORANGE: &str = "<:statusorange:797222239979700263>";
const EMOJI_YELLOW: &str = "<:statusyellow:797222239522390056>";
const EMOJI_GREEN: &str = "<:statusgreen:797222239418187786>";
const EMOJI_BLUE: &str = "<:statusblue:797222239942475786>";

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
