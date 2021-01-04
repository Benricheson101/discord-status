import {config} from 'dotenv';
import {connect} from 'mongoose';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';
import {Logger, LogLevel} from './util/Logger';

config();

export const logger = new Logger({
  levels:
    process.env.NODE_ENV === 'development'
      ? [
          LogLevel.Info,
          LogLevel.Log,
          LogLevel.Command,
          LogLevel.Update,
          LogLevel.Warn,
          LogLevel.Error,
        ]
      : [
          LogLevel.Log,
          LogLevel.Command,
          LogLevel.Update,
          LogLevel.Warn,
          LogLevel.Error,
        ],
});

import './server';
import './updates';

connect(process.env.MONGODB_URL!, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(logger.error);

dayjs.extend(advancedFormat);
dayjs.extend(timezone);

// TODO: yaml config
//   TODO: make less discord-centered and easy to configure for any status page
// TODO: support one webhook/no mongo + oauth
// TODO: oauth pages:
//   TODO: success
//   TODO: error
// TODO: commands:
//   TODO: announce
//   TODO: stop
//   TODO: start
