// Imports data from the old MongoDB database to the new database
//
// Usage:
// $ mongoexport --collection=guilds --db=discord-status --out=dstatus_dump.json
// $ node migrate.js ./dstatus_dump.json
//
import {readFileSync} from 'node:fs';

import {SubscriptionMode} from '@prisma/client';
import {APIWebhook, Routes} from 'discord-api-types/v10';

import {Client} from 'discord-status';

const idToTimestamp = (id: string): Date =>
  new Date(parseInt(id.substring(0, 8), 16) * 1_000);

const modeToSubscriptionMode = (mode: string): SubscriptionMode =>
  mode === 'post' ? SubscriptionMode.Post : SubscriptionMode.Edit;

const main = async () => {
  const filePath = process.argv[2];
  const oldData = readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(d => JSON.parse(d)) as Document[];

  const client = new Client();

  const withValidHooks = (await Promise.all(
    oldData.map(
      async d =>
        [
          d,
          (await client.rest
            .get(Routes.webhook(d.webhook.id, d.webhook.token))
            .catch(err => {
              console.error(err);
              return null;
            })) as APIWebhook | null,
        ] as const
    )
  ).then(r => r.filter(h => h[1] !== null))) as [Document, APIWebhook][];

  console.log(`${withValidHooks.length}/${oldData.length} valid webhhoks`);

  const queries = withValidHooks.map(([d, h]) =>
    client.prisma.subscriptions.create({
      data: {
        channelId: BigInt(h.channel_id),
        guildId: BigInt(d.guild_id),
        createdAt: idToTimestamp(d._id.$oid),
        rolePings: d.config.roles.map(r => BigInt(r)),
        mode: modeToSubscriptionMode(d.config.mode),
        webhookId: BigInt(d.webhook.id),
        webhookToken: d.webhook.token,
        sentUpdates: {
          create: d.updates
            .map(u =>
              u.incident_updates.map(iu => ({
                incidentId: u.incident,
                incidentUpdateId: iu,
                mode: modeToSubscriptionMode(d.config.mode),
                messageId: BigInt(u.msg_id || 0),
                createdAt: idToTimestamp(d._id.$oid),
              }))
            )
            .flat(),
        },
      },
    })
  );

  const created = await client.prisma.$transaction(queries);

  console.log(`Created ${created.length} documents`);
};

main().catch(console.error);

interface Document {
  _id: Id;
  guild_id: string;
  config: Config;
  webhook: Webhook;
  updates: Update[];
}

interface Id {
  $oid: string;
}

interface Config {
  roles: string[];
  mode: 'edit' | 'post';
}

interface Webhook {
  id: string;
  token: string;
}

interface Update {
  incident_updates: string[];
  msg_id?: string;
  incident: string;
  _id: Id;
}
