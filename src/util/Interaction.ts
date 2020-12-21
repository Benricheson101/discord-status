import {AllowedMentions, Webhook, WebhookResponse} from './Webhook';
import {EmbedBuilder, EmbedJSON} from './EmbedBuilder';

export class Interaction extends Webhook {
  constructor(
    hook:
      | string
      | {
          id: NonNullable<WebhookResponse['id']>;
          token: NonNullable<WebhookResponse['token']>;
        }
  ) {
    super(hook);
  }
}

export interface ApplicationCommand {
  id: string;
  application_id: string;
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  default?: boolean;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice;
  options?: ApplicationCommandOption;
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
}

export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

export interface Interaction {
  id: string;
  type: InteractionType;
  data: ApplicationCommandInteractionData;
  guild_id: string;
  channel_id: string;
  member: GuildMember;
  token: string;
  version: number;
}

export enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
}

export interface ApplicationCommandInteractionData {
  id: string;
  name: string;
  options?: ApplicationCommandInteractionDataOption[];
}
export interface BaseCommandInteractionOptions {
  name: string;
}

export interface CommandInteractionOptionsWithOptions
  extends BaseCommandInteractionOptions {
  options: ApplicationCommandInteractionDataOption;
  value?: never;
}

export interface CommandInteractionOptionsWithValue
  extends BaseCommandInteractionOptions {
  options?: never;
  value: string;
}

export type ApplicationCommandInteractionDataOption =
  | CommandInteractionOptionsWithOptions
  | CommandInteractionOptionsWithValue;

export interface InteractionResponse {
  type: InteractionResponseType;
  data?: InteractionApplicationCommandCallbackData;
}

export enum InteractionResponseType {
  Pong = 1,
  Acknowledge = 2,
  ChannelMessage = 3,
  ChannelMessageWithSource = 4,
  ACKWithSource = 5,
}

export interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content: string;
  embeds?: (EmbedBuilder | EmbedJSON)[];
  allowed_mentions?: AllowedMentions;
}

export interface GuildMember {
  deaf: boolean;
  is_pending: boolean;
  joined_at: Date;
  mute: boolean;
  nick: string;
  pending: boolean;
  permissions: string;
  premium_since: Date | null;
  roles: string[];
  user: User;
}

export interface User {
  avatar: string;
  discriminator: string;
  id: string;
  public_flags: number;
  username: string;
}
