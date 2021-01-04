import dayjs from 'dayjs';
import {Interaction} from './Interaction';
import {Incident} from 'statuspage.js';
import {capitalize} from '.';

export class Logger {
  ['constructor']!: typeof Logger;

  levels: LogLevel[] = [
    LogLevel.Info,
    LogLevel.Log,
    LogLevel.Command,
    LogLevel.Update,
    LogLevel.Warn,
    LogLevel.Error,
  ];

  dateFormat = 'MM/DD/YYYY @ HH:mm:ss';
  private date = () => dayjs().format(this.dateFormat);

  constructor(
    ops: Partial<
      Pick<
        Logger,
        {
          [K in keyof Logger]: Logger[K] extends Function ? never : K;
        }[keyof Logger]
      >
    > = {}
  ) {
    Object.assign(this, ops);
  }

  command(i: Interaction) {
    if (!this.levels.includes(LogLevel.Command)) {
      return;
    }

    console.log(
      `\x1b[44;30m${this.date()}\x1b[0m ${
        i.member.user.id
      } used command \x1b[34m${i.toString()}\x1b[0m `
    );
  }

  incidentUpdate(i: Incident) {
    if (!this.levels.includes(LogLevel.Update)) {
      return;
    }

    console.log(
      `\x1b[45;30m${this.date()}\x1b[0m Incident \x1b[34m${
        i.id
      }\x1b[0m received an update: \x1b[1;34m${capitalize(i.status)}\x1b[21m: ${
        i.incident_updates[0].body
      }\x1b[0m`
    );
  }

  sentUpdate(success: number, total: number) {
    if (!this.levels.includes(LogLevel.Update)) {
      return;
    }

    console.log(
      `\x1b[46;30m${this.date()}\x1b[0m update sent to ${success}/${total} webhooks`
    );
  }

  error(...args: unknown[]) {
    if (!this.levels.includes(LogLevel.Error)) {
      return;
    }

    console.error(`\x1b[101;30m${this.date()}\x1b[0m`, ...args);
  }

  info(...args: unknown[]) {
    if (!this.levels.includes(LogLevel.Info)) {
      return;
    }

    console.info(`\x1b[43;30m${this.date()}\x1b[0m`, ...args);
  }

  log(...args: unknown[]) {
    if (!this.levels.includes(LogLevel.Log)) {
      return;
    }

    console.log(`\x1b[102;30m${this.date()}\x1b[0m`, ...args);
  }

  warn(...args: unknown[]) {
    if (!this.levels.includes(LogLevel.Warn)) {
      return;
    }

    console.warn(`\x1b[48;5;208;30m${this.date()}\x1b[0m`, ...args);
  }
}

export enum LogLevel {
  Info,
  Log,
  Command,
  Update,
  Warn,
  Error,
}
