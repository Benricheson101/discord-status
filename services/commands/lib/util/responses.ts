import {
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {Client} from 'lib/struct';

export const notConfiguredResponse = (
  client: Client
): APIInteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    content: `:x: No subscription configured! Run ${client.mc(
      '/config subscribe'
    )} to get started!`,
    flags: MessageFlags.Ephemeral,
  },
});
