import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';
import {connect} from 'mongoose';
import {parseConfig} from './util/config';
import {Logger, LogLevel} from './util/Logger';

export const logger = new Logger({
  levels:
    process.env.NODE_ENV === 'dev'
      ? [LogLevel.Info, LogLevel.Log, LogLevel.Warn, LogLevel.Error]
      : [
          LogLevel.Info,
          LogLevel.Log,
          LogLevel.Command,
          LogLevel.Update,
          LogLevel.Warn,
          LogLevel.Error,
        ],
});

global.logger = logger;

export const config = parseConfig(
  process.env.NODE_ENV === 'dev' ? './config.dev.yml' : './config.yml'
);

if (!config) {
  throw new Error('Unable to parse config.');
}

global.config = config;

import('./updates');

if (global.config.slash_commands?.enabled || global.config.oauth?.enabled) {
  import('./server');
}

connect(global.config.storage.mongodb_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(logger.error);

dayjs.extend(advancedFormat);
dayjs.extend(timezone);

// TODO: make less discord-centered and easy to configure for any status page
// TODO: support running without mongo (config file webhooks only)
// TODO: oauth pages:
//   TODO: success
//   TODO: error
// TODO: commands:
//   TODO: announce
//   TODO: stop
//   TODO: start
//   TODO: purge
