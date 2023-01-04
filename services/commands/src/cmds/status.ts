import {
  APIApplicationCommandInteractionDataSubcommandOption,
  APIApplicationCommandOption,
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {Statuspage} from 'statuspage.js';

import {
  Client,
  Command,
  capitalize,
  formatStatus,
  getStatusEmoji,
} from 'discord-status';

export class StatusCommand extends Command {
  name = 'status';
  description = 'Get a link to the bot support server';

  options: APIApplicationCommandOption[] = [
    {
      name: 'summary',
      description: 'General summary of the status page',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'voice',
      description: 'Voice server status',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ];

  async run(
    client: Client,
    i: APIChatInputApplicationCommandInteraction
  ): Promise<APIInteractionResponse> {
    const s = new Statuspage(process.env.STATUSPAGE_ID);

    const summary = await s.summary();
    const voiceComponentIds = summary.components?.find(
      c => c.name === 'Voice'
    )?.components;

    const subcmd = i.data
      .options![0] as APIApplicationCommandInteractionDataSubcommandOption;

    switch (subcmd.name) {
      case 'summary': {
        const notVoiceComponents = summary.components
          ?.filter(c => !voiceComponentIds?.includes(c.id))
          ?.sort((a, b) => (a.name > b.name ? 1 : -1));

        const componentStatuses =
          notVoiceComponents
            ?.map(
              c =>
                `> ${getStatusEmoji(c.status)} **${c.name}**: ${capitalize(
                  formatStatus(c.status)
                )}`
            )
            .join('\n') || 'No component data available';

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `**Status:** ${summary.status.description}\n${componentStatuses}`,
            flags: MessageFlags.Ephemeral,
          },
        };
      }

      case 'voice': {
        const voiceComponents = voiceComponentIds
          ?.map(c => summary.components?.find(a => a.id === c) || null)
          .filter(Boolean)
          .sort((a, b) => (a!.name > b!.name ? 1 : -1));

        const componentStatuses =
          voiceComponents
            ?.map(
              c =>
                `> ${getStatusEmoji(c!.status)} **${c!.name}**: ${capitalize(
                  formatStatus(c!.status)
                )}`
            )
            .join('\n') || 'No component data available';

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `**Voice Server Status:**\n${componentStatuses}`,
            flags: MessageFlags.Ephemeral,
          },
        };
      }
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: process.env.SUPPORT_SERVER,
        flags: MessageFlags.Ephemeral,
      },
    };
  }
}
