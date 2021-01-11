import {StatuspageUpdates} from 'statuspage.js';
import {Guild, GuildModel, Update} from '../db/models';
import {EditModeEmbed} from '../util/embeds/Edit';
import {PostModeEmbed} from '../util/embeds/Post';
import {logger} from '..';
import {RichWebhookPostResult, Webhook} from '../util/Webhook';

export const s = new StatuspageUpdates(
  global.config.status_page.id || process.env.STATUSPAGE_ID!,
  10_000
);

s.on('incident_update', async i => {
  logger.incidentUpdate(i);

  const before = Date.now();

  const update = i.incident_updates[0];
  const guilds = await GuildModel.find();

  const postEmbed = new PostModeEmbed(i);
  const editEmbed = new EditModeEmbed(i);

  const sendTo: Promise<RichWebhookPostResult | undefined>[] = [
    ...guilds.map(sendUpdate),
    ...(global.config.webhooks?.map(wh =>
      new Webhook(wh).send({embeds: [postEmbed]})
    ) || []),
  ];

  const r = await Promise.allSettled(sendTo);

  const success = r.filter(
    s => s.status === 'fulfilled' && s.value?.webhook_id
  );

  const after = Date.now();

  logger.sentUpdate(
    success.length,
    guilds.length + (global.config.webhooks?.length || 0),
    after - before
  );

  async function sendUpdate(
    guild: Guild
  ): Promise<RichWebhookPostResult | undefined> {
    const roles = guild.config.roles?.map(r => `<@&${r}>`).join(' ');
    const {mode} = guild.config;

    let s: Update | undefined;
    if ((s = guild.updates.find(a => a.incident === i.id))) {
      if (s.incident_updates.includes(update.id)) {
        logger.debug(
          'Webhook with ID',
          guild.webhook.id,
          'has already sent update',
          update.id
        );
        return;
      }
    }

    let sent;

    logger.debug(
      'Attempting to send update to webhook with ID:',
      guild.webhook.id
    );

    if (!s || mode === 'post') {
      sent = await guild.webhook.into().send({
        content: roles || '',
        embeds: [guild.config.mode === 'edit' ? editEmbed : postEmbed].map(e =>
          e.toJSON()
        ),
      });
    } else {
      sent = await guild.webhook.into().editMsg(s.msg_id, {
        content: roles || '',
        embeds: [guild.config.mode === 'edit' ? editEmbed : postEmbed].map(e =>
          e.toJSON()
        ),
      });
    }

    logger.debug(
      'Message sent to webhook',
      guild.webhook.id,
      sent?.webhook_id ? 'was successfully delivered.' : 'failed to send'
    );

    if (s) {
      s.incident_updates.push(update.id);
    } else {
      guild.updates.push({
        msg_id: sent.id,
        incident: i.id,
        incident_updates: [update.id],
      });
    }

    await GuildModel.updateOne({guild_id: guild.guild_id}, guild);
    return sent;
  }
});

s.on('start', async (...args) => {
  const st = await s.statuspage.status();

  logger.log(
    `Checking ${st.page.name} (${st.page.id}) for updates every ${
      s.interval / 1000
    }s`
  );

  logger.debug(...args);
});

s.on('run', async (...args) => logger.debug(...args));
s.on('stop', (...args) => logger.debug(...args));
// s.on('incident_update', (...args) => logger.debug(...args));

s.start().catch(logger.error);
