use std::env;

use twilight_model::{
    channel::message::{
        embed::{EmbedAuthor, EmbedField, EmbedFooter},
        Embed,
    },
    util::Timestamp,
};

use crate::{
    statuspage::{Incident, IncidentUpdate},
    util::{
        get_embed_color,
        get_formatted_timestamp,
        get_status_emoji,
        truncate_with_ellipsis,
    },
};

const TITLE_MAX_LEN: usize = 256;
const FIELD_VALUE_MAX_LEN: usize = 1024;

fn get_base_embed(incident: &Incident) -> Embed {
    let color = get_embed_color(&incident.status);

    let author = EmbedAuthor {
        name: "Discord Status".to_string(),
        icon_url: Some(
            "https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png"
                .to_string(),
        ),
        url: Some(
            env::var("SUPPORT_SERVER")
                .unwrap_or_else(|_| "https://discordstatus.com".to_string()),
        ),
        proxy_icon_url: None,
    };

    let footer = EmbedFooter {
        text: "Started".to_string(),
        icon_url: None,
        proxy_icon_url: None,
    };

    let embed_ts = Timestamp::from_secs(incident.created_at.timestamp())
        .expect("Got invalid timstamp");

    let mut embed = Embed {
        author: Some(author),
        color: Some(color),
        footer: Some(footer),
        kind: "rich".to_string(),
        timestamp: Some(embed_ts),
        url: Some(incident.shortlink.clone()),

        description: None,
        fields: Vec::new(),
        image: None,
        provider: None,
        thumbnail: None,
        title: None,
        video: None,
    };

    if incident.name.len() > TITLE_MAX_LEN {
        embed.description = Some(format!("**{}**", incident.name.clone()));
        embed.title = Some("Discord Status Update".to_string());
    } else {
        embed.title = Some(incident.name.clone());
    }

    embed
}

pub fn make_post_embed(incident: &Incident, update: &IncidentUpdate) -> Embed {
    let emoji = get_status_emoji(&update.status);
    let color = get_embed_color(&update.status);
    // TODO: use display_at? -- seems to be a changable timestamp on the statuspage dashboard
    let update_ts = get_formatted_timestamp(&update.created_at);

    let field = EmbedField {
        name: format!(
            "{} {} ({})",
            emoji,
            update.status.to_string(),
            update_ts
        ),
        value: truncate_with_ellipsis(update.body.clone(), FIELD_VALUE_MAX_LEN),
        inline: false,
    };

    let mut embed = get_base_embed(incident);
    embed.color = Some(color);
    embed.fields.push(field);

    embed
}

pub fn make_edit_embed(incident: &Incident) -> Embed {
    let fields = incident
        .incident_updates
        .iter()
        .take(25)
        .rev()
        .map(|upd| {
            let emoji = get_status_emoji(&upd.status);
            let ts = get_formatted_timestamp(&upd.created_at);

            EmbedField {
                name: format!("{} {} ({})", emoji, upd.status.to_string(), ts),
                value: truncate_with_ellipsis(
                    upd.body.clone(),
                    FIELD_VALUE_MAX_LEN,
                ),
                inline: false,
            }
        })
        .collect::<Vec<_>>();

    let mut embed = get_base_embed(incident);
    embed.fields = fields;

    embed
}
