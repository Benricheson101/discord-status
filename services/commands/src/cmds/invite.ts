import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import {Client, Command} from 'discord-status';

export class InviteCommand extends Command {
  name = 'invite';
  description = 'Get a link to invite the bot';

  async run(
    _client: Client,
    i: APIChatInputApplicationCommandInteraction
  ): Promise<APIInteractionResponse> {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `https://discord.com/oauth2/authorize?client_id=${i.application_id}&scope=bot%20applications.commands`,
        flags: MessageFlags.Ephemeral,
      },
    };
  }
}
