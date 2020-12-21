import axios, {AxiosResponse} from 'axios';
import {EmbedBuilder, EmbedJSON} from './EmbedBuilder';

export class Webhook {
  ['constructor']!: typeof Webhook;

  token: string;
  id: string;

  constructor(
    hook:
      | string
      | {
          id: NonNullable<WebhookResponse['id']>;
          token: NonNullable<WebhookResponse['token']>;
        }
  ) {
    if (typeof hook === 'string') {
      hook = this.constructor.parse(hook);
    }

    this.token = hook.token;
    this.id = hook.id;
  }

  async get(): Promise<WebhookResponse> {
    const result = await axios.get(this.URL);
    return result.data;
  }

  async send(body: WebhookBody): Promise<RichWebhookPostResult> {
    const result: AxiosResponse<WebhookPostResult> = await axios.post(
      `${this.URL}?wait=1`,
      body
    );

    return this.makeRich(result.data);
  }

  async editMsg(
    msg: string,
    body: Pick<WebhookBody, 'content' | 'embeds' | 'allowed_mentions'>
  ): Promise<RichWebhookPostResult> {
    const result = await axios.patch(`${this.URL}/messages/${msg}`, body);

    return this.makeRich(result.data);
  }

  async deleteMsg(msg: string): Promise<boolean> {
    const result = await axios.delete(`${this.URL}/messages/${msg}`);

    return result.status === 204;
  }

  async delete() {
    const result = await axios.delete(this.URL);

    return result.status === 204;
  }

  private makeRich(data: WebhookPostResult): RichWebhookPostResult {
    const r: Partial<RichWebhookPostResult> = {};

    r.embeds = data.embeds.map(e => new EmbedBuilder(e));
    r.timestamp = new Date(data.timestamp);
    r.edited_timestamp &&= new Date(data.edited_timestamp!);
    Object.assign(r, data);

    return r as RichWebhookPostResult;
  }

  get URL(): string {
    return `https://discord.com/api/webhooks/${this.id}/${this.token}`;
  }

  async isValid(): Promise<boolean> {
    const res: AxiosResponse<WebhookResponse> = await axios.get(this.URL, {
      validateStatus: null, // don't throw if status isn't 2xx
    });

    return res.status === 200 && res.data.id === this.id;
  }

  static parse(
    hook: string
  ): {
    id: NonNullable<WebhookResponse['id']>;
    token: NonNullable<WebhookResponse['token']>;
  } {
    const re = /^(?:https?:\/\/)(?:canary.|ptb.)?discord(?:app)?.com\/api\/webhooks\/(?<id>\d{16,18})\/(?<token>[-_A-Za-z0-9.]+)(\?.*)?$/;
    const groups = re.exec(hook)?.groups;

    if (!(groups?.token && groups?.id)) {
      throw new TypeError('Invalid webhook');
    }

    return {
      id: groups.id,
      token: groups.token,
    };
  }

  toJSON(): {id: string; token: string} {
    return {
      id: this.id,
      token: this.token,
    };
  }
}

export interface WebhookResponse {
  id: string;
  type: 1 | 2;
  guild_id?: string;
  channel_id: string;
  user?: object;
  name: string | null;
  avatar: string | null;
  token?: string;
  application_id: string | null;
}

export interface WebhookBody {
  username?: string;
  content?: string;
  avatar_url?: string;
  tts?: boolean;
  file?: Buffer;
  embeds?: (EmbedBuilder | EmbedJSON)[];
  allowed_mentions?: AllowedMentions;
}

export interface AllowedMentions {
  parse?: ('roles' | 'users' | 'everyone')[];
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
}

export interface WebhookPostResult {
  id: string;
  type: number;
  content: string;
  author: {
    bot: boolean;
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  attachments: {
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    height: number | null;
    width: number | null;
  }[];
  embeds: EmbedJSON[];
  mentions: string[];
  mention_roles: string[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  webhook_id: string;
}

export interface RichWebhookPostResult
  extends Omit<WebhookPostResult, 'embeds' | 'timestamp' | 'edited_timestamp'> {
  embeds: EmbedBuilder[];
  timestamp: Date;
  edited_timestamp: Date | null;
}
