import {Document, Model, model, Schema} from 'mongoose';
import {Webhook} from '../util/Webhook';

const webhook = new Schema({
  _id: {type: String, required: true}, // guild id
  // guild_id: {type: String, required: true},
  channel_id: {type: String, required: true},
  created_at: {type: Date, required: true, default: new Date()},
  roles: {type: [String], required: true, default: []},
  webhook: {
    id: {type: String, required: true},
    token: {type: String, required: true},
    avatar_url: {type: String, required: false},
    username: {type: String, required: false},
  },
});

webhook.statics = {
  async from(hook: Webhook): Promise<WebhookDoc> {
    if (!hook.isValid()) {
      throw new Error('Invalid Webhook');
    }

    const data = await hook.get();

    return new Webhooks({
      _id: data.guild_id!,
      // guild_id: data.guild_id!,
      channel_id: data.channel_id!,
      webhook: hook.toJSON(),
    });
  },
};

webhook.post('init', doc => {
  doc._doc.webhook = new Webhook(doc._doc.webhook);
  return doc;
});

webhook.pre<WebhookDoc>('validate', async function (next) {
  const wh = new Webhook(this.webhook);

  if (!(await wh.isValid())) {
    next(new Error('invalid webhook'));
  }

  next(null);
});

webhook.post<Document<WebhooksDoc>>('save', doc => {
  doc._doc.webhook = new Webhook(doc._doc.webhook);
  return doc;
});

export const Webhooks = model<WebhookDoc, WebhookModel>('webhook', webhook);

export interface WebhooksDoc {
  _id: string;
  guild_id: string;
  channel_id: string;
  created_at: Date;
  roles: string[];
  webhook: {
    id: string;
    token: string;
    avatar_url?: string;
    username?: string;
  };
}

export interface WebhookDoc extends Document<Omit<WebhooksDoc, 'webhook'>> {
  webhook: Webhook;
}

export interface WebhookModel extends Model<WebhookDoc> {
  from(arg0: Webhook): Promise<WebhookDoc>;
}
