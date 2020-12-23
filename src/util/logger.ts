// import {createLogger, format, transports} from 'winston';
// const {combine, splat, timestamp, printf} = format;

// const logFormat = printf(({level, message, timestamp, ...metadata}) => {
//   let msg = `${timestamp} [${level}] : ${message}`;

//   if (metadata) {
//     msg += JSON.stringify(metadata);
//   }

//   return msg;
// });

// export const logger = createLogger({
//   level: 'debug',
//   format: combine(format.colorize(), splat(), timestamp(), logFormat),
//   transports: [
//     new transports.Console({level: 'info'}),
//     new transports.File({filename: 'debug.log', level: 'debug'}),
//   ],
// });

import {createLogger, transports, Logger, LeveledLogMethod} from 'winston';

const levels = {
  error: 0,
  update: 1,
  guild: 2,
  command: 3,
};

export const logger = createLogger({
  levels,
  transports: [new transports.Console()],
}) as Logger & Record<keyof typeof levels, LeveledLogMethod>;
