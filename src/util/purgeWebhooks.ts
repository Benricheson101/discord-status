import {logger} from '..';
import {GuildModel} from '../db/models';

export async function purgeWebhooks(
  dryrun = false
): Promise<{total: number; valid: number; invalid: number; deleted: number}> {
  const guilds = await GuildModel.find();

  const toDelete: string[] = [];

  const out = {
    total: guilds.length,
    valid: 0,
    invalid: 0,
    deleted: 0,
  };

  await Promise.allSettled(
    guilds.map(async g => {
      const w = await g.webhook.into().get();

      if (!w.guild_id) {
        out.invalid++;
        toDelete.push(g.guild_id);
        return;
      }

      out.valid++;
    })
  );

  if (!dryrun) {
    const result = await GuildModel.deleteMany({guild_id: {$in: toDelete}});

    out.deleted = result.deletedCount || 0;
  }

  return out;
}

export async function autoPurge(interval = 8.64e7) {
  const d = async () => {
    const deleted = await purgeWebhooks();

    logger.debug(deleted);

    logger.log(
      `[AUTO] Deleted ${deleted.deleted}/${deleted.invalid} invalid webhooks.`
    );
  };

  await d();
  setInterval(d, interval);
}
