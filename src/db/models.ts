import {getModelForClass, prop} from '@typegoose/typegoose';
import {Webhook} from '../util/Webhook';
import {set} from 'mongoose';

set('useCreateIndex', true);

class GuildWebhook {
  @prop({required: true})
  id!: string;

  @prop({required: true})
  token!: string;

  into() {
    return new Webhook(this);
  }
}

class GuildConfig {
  @prop({required: true, default: [], type: [String]})
  roles!: string[];

  @prop({required: true, enum: ['edit', 'post'], default: 'post'})
  mode!: string;
}

export class Guild {
  @prop({required: true, unique: true})
  guild_id!: string;

  @prop({required: true})
  config!: GuildConfig;

  @prop({validate: v => new Webhook(v).isValid()})
  webhook!: GuildWebhook;

  getWebhook(): Webhook {
    return new Webhook(this.webhook);
  }

  static async get(guild_id: string) {
    return GuildModel.findOne({guild_id});
  }

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
