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
    util::{get_embed_color, get_formatted_timestamp, get_status_emoji},
};

// TODO: can this be made to not move?
fn get_base_embed(incident: Incident) -> Embed {
    let color = get_embed_color(&incident.status);

    let author = EmbedAuthor {
        name: "Discord Status".to_string(),
        icon_url: Some(
            "https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png"
                .to_string(),
        ),
        url: Some(
            env::var("SUPPORT_SERVER")
                .unwrap_or("https://discordstatus.com".to_string()),
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
        url: Some(incident.shortlink),

        description: None,
        fields: Vec::new(),
        image: None,
        provider: None,
        thumbnail: None,
        title: None,
        video: None,
    };

    if incident.name.len() > 256 {
        embed.description = Some(format!("**{}**", incident.name.clone()));
        embed.title = Some("Discord Status Update".to_string());
    } else {
        embed.title = Some(incident.name.clone());
    }

    embed
}

pub fn make_post_embed(incident: Incident, update: IncidentUpdate) -> Embed {
    let emoji = get_status_emoji(&update.status);
    let update_ts = get_formatted_timestamp(&update.updated_at);

    let field = EmbedField {
        name: format!(
            "{} {} ({})",
            emoji,
            update.status.to_string(),
            update_ts
        ),
        value: update.body,
        inline: false,
    };

    let mut embed = get_base_embed(incident);
    embed.fields.push(field);

    embed
}

pub fn make_edit_embed(incident: Incident) -> Embed {
    let fields = incident
        .incident_updates
        .iter()
        .take(25)
        .rev()
        .map(|upd| {
            let emoji = get_status_emoji(&upd.status);
            let ts = get_formatted_timestamp(&upd.updated_at);

            EmbedField {
                name: format!("{} {} ({})", emoji, upd.status.to_string(), ts),
                value: upd.body.clone(),
                inline: false,
            }
        })
        .collect::<Vec<_>>();

    let mut embed = get_base_embed(incident);
    embed.fields = fields;

    embed
}
