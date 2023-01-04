import {
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import {Command} from 'discord-status';

export class SupportCommand extends Command {
  name = 'support';
  description = 'Get a link to the bot support server';

  async run(): Promise<APIInteractionResponse> {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: process.env.SUPPORT_SERVER,
        flags: MessageFlags.Ephemeral,
      },
    };
  }
}
