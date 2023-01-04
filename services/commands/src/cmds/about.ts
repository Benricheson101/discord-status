import {
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import {Client, Command} from 'discord-status';

export class AboutCommand extends Command {
  name = 'about';
  description = 'Get some info about the bot';

  async run(client: Client): Promise<APIInteractionResponse> {
    const subscriptions = await client.prisma.subscriptions.count();

    const msg = [
      '**Discord Status**',
      '> **Author:** [Ben!#0002](<https://github.com/benricheson101>)',
      '> **Source Code:** <https://github.com/benricheson101/discord-status>',
      `> **Subscriptions:** ${subscriptions}`,
    ].join('\n');

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: msg,
        flags: MessageFlags.Ephemeral,
      },
    };
  }
}
