import {
  Interaction,
  InteractionResponseFlags,
  InteractionResponseType,
} from '../util/Interaction';
import {Request, Response} from 'express';
import {allCmdJson, INVITE_URL} from '../util';
import extendedHelp from '../../cmds/help_text.json';
import {Webhook} from '../util/Webhook';
import {Webhooks} from '../db/models';

const commands = allCmdJson('cmds');

type ExtendedHelp = Record<string, 'subscribe'>;

const MANAGE_WEBHOOKS = 536870912;
const ADMINISTRATOR = 8;

export async function handleCommands(
  req: Request<{}, {}, Interaction>,
  res: Response
) {
  const i = new Interaction(req.body);
  const cmds = await commands;

  switch (i.data.name) {
    case 'config': {
      break;
    }

    case 'help': {
      if (
        i.data?.options?.[0].value &&
        Object.keys(extendedHelp).includes(i.data.options[0].value as string)
      ) {
        const msg = (extendedHelp as ExtendedHelp)[
          i.data.options[0].value as string
        ];

        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: msg || 'Documentation unavailable.',
          },
        });

        break;
      }

      const start = '-- **Commands** --\n';
      const c = cmds
        .map(c => `\`${c.name}\` \u21D2 ${c.description}`)
        .join('\n');
      const end = '\n\nNote: most commands have several subcommands.';

      await i.send({
        type: InteractionResponseType.ChannelMessage,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: start + c + end,
        },
      });

      break;
    }

    case 'invite': {
      await i.send({
        type: InteractionResponseType.ChannelMessage,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: INVITE_URL,
        },
      });

      break;
    }

    case 'subscribe': {
      const permissions = i.member.permissions;

      if (
        (parseInt(permissions) & MANAGE_WEBHOOKS) !== MANAGE_WEBHOOKS &&
        (parseInt(permissions) & ADMINISTRATOR) !== ADMINISTRATOR
      ) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: 'You do not have permission to use this command.',
          },
        });

        break;
      }

      const url = i.data.options![0].value as string;

      const parsed = Webhook.parse(url);

      if (!parsed) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              "That doesn't look right. If you don't know how to get a webhook URL, try running `/help Creating a webhook`",
          },
        });

        break;
      }

      const wh = new Webhook(parsed);
      const data = await wh.get();

      if (!data?.guild_id) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              'That webhook is invalid. Double check that the webhook was not deleted and that you have not added or removed any parts of the URL. If you need help creating a new webhook, refer to `/help Creating a webhook`',
          },
        });

        break;
      }

      const found = await Webhooks.findById(data.guild_id);

      if (found) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              'You already have a webhook posting status updates in your server. If you would like to move the feed to another channel, run `/unsubscribe` first, followed by `/subscribe`.',
          },
        });

        break;
      }

      const dbWh = await Webhooks.from(wh);

      try {
        await dbWh.save();

        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: `You are now subscribed to status page updates. All new status page updates will be posted in <#${data.channel_id}>`,
          },
        });

        break;
      } catch (err) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              'An unhandled error occurred, try running the command again. If this continues happening, join the support server (`/support`) for help.',
          },
        });

        console.error(err);
      }

      break;
    }

    case 'support': {
      await i.send({
        type: InteractionResponseType.ChannelMessage,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: `https://discord.gg/${process.env.SUPPORT_SERVER!}`,
        },
      });

      break;
    }

    case 'unsubscribe': {
      const permissions = i.member.permissions;

      if (
        (parseInt(permissions) & MANAGE_WEBHOOKS) !== MANAGE_WEBHOOKS &&
        (parseInt(permissions) & ADMINISTRATOR) !== ADMINISTRATOR
      ) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: 'You do not have permission to use this command.',
          },
        });

        break;
      }

      try {
        const result: {
          n: number;
          ok: 1 | 0;
          deletedCount: number;
        } = await Webhooks.deleteOne({_id: i.guild_id});

        if (result.n && result.ok) {
          await i.send({
            type: InteractionResponseType.ChannelMessage,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: 'You will no longer receive status updates.',
            },
          });

          break;
        } else if (!result.n && result.ok) {
          await i.send({
            type: InteractionResponseType.ChannelMessage,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: 'You are not subscribed to status page updates.',
            },
          });

          break;
        } else {
          throw new Error();
        }
      } catch (err) {
        await i.send({
          type: InteractionResponseType.ChannelMessage,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              'An unhandled error occurred, try running the command again. If this continues happening, join the support server (`/support`) for help.',
          },
        });

        if (err.message) {
          console.error(err);
        }
      }

      break;
    }
  }

  return res.status(200).send('OK');
}
