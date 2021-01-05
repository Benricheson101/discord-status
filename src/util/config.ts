import {readFileSync} from 'fs';
import {safeLoad} from 'js-yaml';

export function parseConfig(path: string): Config | undefined {
  try {
    const yaml = readFileSync(path, 'utf-8');
    const parsed = safeLoad(yaml);

    if (!parsed) {
      throw new Error('Unable to parse config.');
    }

    return parsed as Config;
  } catch (err) {
    global.logger.error(err);
  }

  return;
}

export interface Config {
  admins: string[];
  mods: string[];

  status_page: {
    id: string;
  };

  slash_commands?: {
    enabled: boolean;
    application_id: string;
    public_key: string;
  };

  storage: {
    // multi: boolean;
    mongodb_url: string;
  };

  oauth?: {
    enabled: boolean;
    client_id?: string;
    client_secret?: string;
    redirect_uri?: string;
  };

  webhooks?: {id: string; token: string}[];

  meta?: {
    support_server?: string;
  };
}
