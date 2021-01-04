import {getModelForClass, prop} from '@typegoose/typegoose';
import {Webhook} from '../util/Webhook';
import {set} from 'mongoose';

set('useCreateIndex', true);

/** The webhook to send updates to */
export class GuildWebhook {
  /** The webhook ID */
  @prop({required: true})
  id!: string;

  /** The webhook token */
  @prop({required: true})
  token!: string;

  /** Turn a DB webhook into a rich webhook object */
  into() {
    return new Webhook(this);
  }
}

/** A guild's configuration */
export class GuildConfig {
  /** Which roles to ping when a new message is posted */
  @prop({required: true, default: [], type: [String]})
  roles!: string[];

  /**
   * What type of messages will be sent with status updates
   *
   * - `post` => post a new message every time the status page receives an update
   * - `edit` => send one message when an incident starts and edit in updates as they are published
   */
  @prop({required: true, enum: ['edit', 'post'], default: 'post'})
  mode!: string;

  /**
   * Returns the config formatted nicely with markdown n stuff
   * @returns the config
   */
  pretty(): string {
    return `**Mode**: ${this.mode}\n**Roles**: ${
      this.roles.map(r => `<@&${r}>`).join(' ') || 'none'
    }`;
  }
}

/** An incident that has been successfully sent via webhooks */
export class Update {
  /**
   * The ID of the last message sent. This is useless for `post` mode
   * but it is used for message `edits` in edit mode
   */
  @prop({required: true})
  msg_id!: string;

  /** The ID of the incident */
  @prop({required: true})
  incident!: string;

  /** An array of incident_update IDs that have been successfully sent */
  @prop({required: true, default: [], type: [String]})
  incident_updates!: string[];
}

/** A single guild's database document */
export class Guild {
  /** The guild's ID */
  @prop({required: true, unique: true})
  guild_id!: string;

  /** Guild settings */
  @prop({required: true})
  config!: GuildConfig;

  /** The webhook being used to send status updates */
  @prop({validate: v => new Webhook(v).isValid()})
  webhook!: GuildWebhook;

  /** An array of incidents that has been sent to a server */
  @prop({required: true, default: [], type: [Update]})
  updates!: Update[];

  /** Get a rich webhook object from a guild's stored webhook */
  getWebhook(): Webhook {
    return new Webhook(this.webhook);
  }

  /** Get a guild by ID */
  static async get(guild_id: string) {
    return GuildModel.findOne({guild_id});
  }

  /** Convert a webhook into an instance of the mongoose model */
  static async from(hook: Webhook) {
    if (!(await hook.isValid())) {
      throw new Error('invalid webhook');
    }

    const data = await hook.get();

    return new GuildModel({
      guild_id: data.guild_id,
      config: {},
      webhook: {
        id: data.id,
        token: data.token,
      },
    });
  }
}

export const GuildModel = getModelForClass(Guild);
