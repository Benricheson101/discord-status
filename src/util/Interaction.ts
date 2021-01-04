import {AllowedMentions, RichWebhookPostResult, WebhookBody} from './Webhook';
import {EmbedBuilder, EmbedJSON} from './EmbedBuilder';
import axios from 'axios';

export class Interaction {
  private sentInitial = false;

  constructor(interaction: Interaction) {
    Object.assign(this, interaction);
  }

  /** Respond to an interaction */
  async send<
    T = InteractionResponse | WebhookBody,
    U = T extends InteractionResponse ? void : RichWebhookPostResult
  >(body: T): Promise<U> {
    const url = this.sentInitial ? this.webhookURL : this.callbackURL;

    const result = await axios.post(url, body, {
      validateStatus: null,
    });

    this.sentInitial = true;

    return result.data;
  }

  /** Edit an interaction response */
  async edit(body: WebhookBody, id = '@original') {
    const result = await axios.patch(
      `${this.webhookURL}/messages/${id}`,
      body,
      {
        validateStatus: null,
      }
    );

    return result.data;
  }

  /** The full command that was used */
  toString() {
    const fullcmd: (string | number | boolean)[] = [this.data.name];

    const descend = (s: ApplicationCommandInteractionDataOption[]) => {
      for (const op of s) {
        fullcmd.push(op?.value ? `${op.name}:` : op.name);

        if (op.options) {
          descend(op.options);
        }

        if (op.value !== undefined) {
          fullcmd.push(op.value);
        }
      }
    };

    if (this.data.options) {
      descend(this.data.options);
    }

    return '/' + fullcmd.join(' ');
  }

  /** The callback URL for sending an initial response */
  get callbackURL(): string {
    return `https://discord.com/api/v8/interactions/${this.id}/${this.token}/callback`;
  }

  /** The webhook URL for responding */
  get webhookURL(): string {
    return `https://discord.com/api/v8/webhooks/${process.env
      .APPLICATION_ID!}/${this.token}`;
  }

  /** The full command that was used */
  get content(): string {
    return this.toString();
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

export type ApplicationCommandInteractionDataOption =
  | {
      name: string;
      options: ApplicationCommandInteractionDataOption[];
      value?: never;
    }
  | {
      name: string;
      options?: never;
      value: string | number | boolean;
    };

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

export enum InteractionResponseFlags {
  EPHEMERAL = 64,
}

export interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content?: string;
  flags?: InteractionResponseFlags;
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
