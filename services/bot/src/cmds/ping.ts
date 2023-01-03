import {
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import {Command} from 'discord-status';

export class PingCommand extends Command {
  name = 'ping';
  description = 'Pong!';

  async run(): Promise<APIInteractionResponse> {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Pong!',
        flags: MessageFlags.Ephemeral,
      },
    };
  }
}
