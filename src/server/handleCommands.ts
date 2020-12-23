import {
  Interaction,
  InteractionResponseFlags,
  InteractionResponseType,
} from '../util/Interaction';
import {Request, Response} from 'express';
import {allCmdJson} from '../util';

const commands = allCmdJson('cmds');

export async function handleCommands(
  req: Request<{}, {}, Interaction>,
  res: Response
) {
  const i = new Interaction(req.body);
  const cmds = await commands;

  switch (i.data.name) {
    case 'invite': {
      await i.send({
        type: InteractionResponseType.ChannelMessage,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: '<insert link here lol>',
        },
      });

      break;
    }

    case 'help': {
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
  }

  return res.status(200).send('OK');
}
