import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';
import {connect} from 'mongoose';
import {autoPurge} from './util/purgeWebhooks';
import {parseConfig} from './util/config';
import {Logger, LogLevel} from './util/Logger';

dayjs.extend(advancedFormat);
dayjs.extend(timezone);

export const logger = new Logger(
  process.env.NODE_ENV === 'dev'
    ? {}
    : {
        levels: [
          LogLevel.Info,
          LogLevel.Log,
          LogLevel.Command,
          LogLevel.Update,
          LogLevel.Warn,
          LogLevel.Error,
        ],
      }
);

global.logger = logger;

export const config = parseConfig(
  process.env.NODE_ENV === 'dev' ? './config.dev.yml' : './config.yml'
);

if (!config) {
  throw new Error('Unable to parse config.');
}

global.config = config;

connect(global.config.storage.mongodb_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(logger.error);

import('./updates');

if (global.config.slash_commands?.enabled || global.config.oauth?.enabled) {
  import('./server');
}

if (global.config.storage.auto_purge && process.env.NODE_ENV !== 'dev') {
  logger.log('Auto purge enabled 🗸');
  autoPurge().catch(logger.error);
}

// TODO: make less discord-centered and easy to configure for any status page
// TODO: support running without mongo (config file webhooks only)
// TODO: oauth pages:
//   TODO: success
//   TODO: error
