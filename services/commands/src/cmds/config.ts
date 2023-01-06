import {DiscordAPIError} from '@discordjs/rest';
import {SubscriptionMode} from '@prisma/client';
import {
  APIApplicationCommandInteractionDataChannelOption,
  APIApplicationCommandInteractionDataRoleOption,
  APIApplicationCommandInteractionDataStringOption,
  APIApplicationCommandInteractionDataSubcommandGroupOption,
  APIApplicationCommandInteractionDataSubcommandOption,
  APIApplicationCommandOption,
  APIChatInputApplicationCommandInteraction,
  APIEmbed,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ChannelType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
  Routes,
} from 'discord-api-types/v10';

import {
  Client,
  Command,
  capitalize,
  notConfiguredResponse,
} from 'discord-status';

export class ConfigCommand extends Command {
  name = 'config';
  description = 'Control how the bot works';
  dm_permission = false;
  default_member_permissions = PermissionFlagsBits.ManageGuild.toString();

  options: APIApplicationCommandOption[] = [
    {
      name: 'get',
      description: 'Shows the entire configuration',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'roles',
      description: 'Ping a role when the status page is updated',
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'add',
          description: 'Add an additional role to ping',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'role',
              description: 'The role to add',
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: 'remove',
          description: 'Stop a role from being pinged',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'role',
              description: 'The role to remove',
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: 'get',
          description: 'Show which roles will be pinged',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
    {
      name: 'mode',
      description: 'How incidents should be posted',
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'edit',
          description:
            'Send one message per incident, and edit it with each update',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'post',
          description: 'Post a new message for every incident update',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
    {
      name: 'subscribe',
      description: 'Subscribe to status page updates',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'The channel to post updates in',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true,
        },
      ],
    },
    {
      name: 'unsubscribe',
      description: 'Unsubscribe from status page updates',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ];

  async run(
    client: Client,
    i: APIChatInputApplicationCommandInteraction
  ): Promise<APIInteractionResponse | void> {
    const subcmd = i.data.options![0];

    switch (subcmd.name) {
      case 'get': {
        const config = await client.prisma.subscriptions.findFirst({
          where: {
            guildId: BigInt(i.guild_id!),
          },
          select: {
            channelId: true,
            mode: true,
            rolePings: true,
            webhookId: true,
          },
        });

        if (!config) {
          return notConfiguredResponse(client);
        }

        const msg = [
          ':tools: **Server Configuration:**',
          `>>> **Feed Channel:** <#${config.channelId}>`,
          config.webhookId && `**Webhook ID:** ${config.webhookId}`,
          `**Mode:** ${capitalize(config.mode)}`,
          `**Role Pings:** ${
            config.rolePings.map(r => `<@&${r}>`).join(', ') || 'None'
          }`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: msg,
            allowed_mentions: {parse: []},
          },
        };
      }

      case 'roles': {
        const action = (
          subcmd as APIApplicationCommandInteractionDataSubcommandGroupOption
        ).options![0] as APIApplicationCommandInteractionDataSubcommandOption;

        const configuredRoles = await client.prisma.subscriptions.findFirst({
          where: {
            guildId: BigInt(i.guild_id!),
          },
          select: {
            rolePings: true,
          },
        });

        if (!configuredRoles) {
          return notConfiguredResponse(client);
        }

        switch (action.name) {
          case 'add': {
            const {value: role} =
              action.options![0] as APIApplicationCommandInteractionDataRoleOption;

            if (configuredRoles.rolePings.includes(BigInt(role))) {
              return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: ':x: That role is already in the ping list.',
                  flags: MessageFlags.Ephemeral,
                },
              };
            }

            await client.prisma.subscriptions.update({
              data: {
                rolePings: {
                  push: BigInt(role),
                },
              },
              where: {
                guildId: BigInt(i.guild_id!),
              },
            });

            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `:white_check_mark: <@&${role}> will now be pinged for status updates`,
                allowed_mentions: {parse: []},
              },
            };
          }

          case 'remove': {
            const {value: role} =
              action.options![0] as APIApplicationCommandInteractionDataRoleOption;

            if (!configuredRoles.rolePings.includes(BigInt(role))) {
              return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: `:x: <@&${role}> is not configured to be pinged`,
                  allowed_mentions: {parse: []},
                  flags: MessageFlags.Ephemeral,
                },
              };
            }

            const newRoles = configuredRoles.rolePings.filter(
              r => r !== BigInt(role)
            );

            await client.prisma.subscriptions.update({
              data: {
                rolePings: {
                  set: newRoles,
                },
              },
              where: {
                guildId: BigInt(i.guild_id!),
              },
            });

            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `:white_check_mark: Removed <@&${role}> from the ping list`,
                allowed_mentions: {parse: []},
              },
            };
          }

          case 'get': {
            const rolesFmtd =
              configuredRoles.rolePings.map(r => `<@&${r}>`).join('\n') ||
              'no roles configured';

            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `When the status page receives an update, the following roles will be pinged:\n>>> ${rolesFmtd}`,
                allowed_mentions: {
                  parse: [],
                },
              },
            };
          }
        }
        break;
      }

      case 'mode': {
        const opt = (
          subcmd as APIApplicationCommandInteractionDataSubcommandOption
        ).options![0] as APIApplicationCommandInteractionDataStringOption;

        const currentMode = await client.prisma.subscriptions.findFirst({
          where: {
            guildId: BigInt(i.guild_id!),
          },
          select: {
            mode: true,
          },
        });

        if (!currentMode) {
          return notConfiguredResponse(client);
        }

        const newMode =
          opt.name === 'post' ? SubscriptionMode.Post : SubscriptionMode.Edit;

        if (newMode === currentMode.mode) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `:x: Mode is already set to \`${newMode.toUpperCase()}\``,
              flags: MessageFlags.Ephemeral,
            },
          };
        }

        await client.prisma.subscriptions.update({
          data: {
            mode: newMode,
          },
          where: {
            guildId: BigInt(i.guild_id!),
          },
        });

        const msg = {
          [SubscriptionMode.Edit]:
            'Mode is now set to `EDIT`. Each incident will get one message in your status page feed, which will be edited every time an update is published.',
          [SubscriptionMode.Post]:
            'Mode is now set to `POST`. Every update will get its own message in your status page feed.',
        }[newMode];

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `:white_check_mark: ${msg}`,
          },
        };
      }

      case 'subscribe': {
        const channel = (
          subcmd as APIApplicationCommandInteractionDataSubcommandOption
        ).options![0] as APIApplicationCommandInteractionDataChannelOption;

        const isSubscribed = await client.prisma.subscriptions.findFirst({
          where: {
            guildId: BigInt(i.guild_id!),
          },
          select: {
            channelId: true,
          },
        });

        if (isSubscribed) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `:x: You already have a feed configured! If you would like to set up a new channel, first use the ${client.mc(
                '/config unsubscribe'
              )} command`,
              flags: MessageFlags.Ephemeral,
            },
          };
        }

        try {
          await client.rest.post(Routes.channelMessages(channel.value), {
            body: {
              embeds: [
                {
                  description: `Subescribed to [Discord Status](${process.env.STATUSPAGE_URL}) updates!`,
                  color: 0x43b581,
                  author: {
                    name: 'Discord Status',
                    icon_url:
                      'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
                  },
                  footer: {
                    text: 'To unsubscribe, use the `/config unsubscribe` command',
                  },
                } as APIEmbed,
              ],
            },
          });
        } catch (err) {
          if (err instanceof DiscordAPIError) {
            if ([50001, 50013].includes(err.code as number)) {
              return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content:
                    ':x: I do not have permission to send messages in that channel!',
                  flags: MessageFlags.Ephemeral,
                },
              };
            } else {
              return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: `:x: Failed to create subscription: \`${err.message}\``,
                  flags: MessageFlags.Ephemeral,
                },
              };
            }
          }

          console.error('Failed to create subscription:', err);
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: ':x: Failed to create subscription, please try again',
              flags: MessageFlags.Ephemeral,
            },
          };
        }

        await client.prisma.subscriptions.create({
          data: {
            guildId: BigInt(i.guild_id!),
            channelId: BigInt(channel.value),
          },
        });

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `:white_check_mark: Subscribed to status page updates in <#${channel.value}>!`,
          },
        };
      }

      case 'unsubscribe': {
        const isSubscribed = await client.prisma.subscriptions.findFirst({
          where: {
            guildId: BigInt(i.guild_id!),
          },
          select: {
            channelId: true,
          },
        });

        if (!isSubscribed) {
          return notConfiguredResponse(client);
        }

        await client.prisma.subscriptions.delete({
          where: {
            guildId: BigInt(i.guild_id!),
          },
        });

        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: ':white_check_mark: Unsubscribed from status page updates',
          },
        };
      }
    }
  }
}
