import path from 'node:path';

import {REST} from '@discordjs/rest';
import {PrismaClient} from '@prisma/client';
import {APIApplicationCommand, Routes} from 'discord-api-types/v10';
import {readdir} from 'fs/promises';

import {Command} from './command';

const COMMAND_DIR = path.join(__dirname, '..', '..', 'src', 'cmds');

export class Client {
  cmds = new Map<string, Command>();
  readonly registeredCmds = new Map<string, APIApplicationCommand>();
  readonly rest: REST;
  readonly prisma = new PrismaClient();
  readonly clientID: string;

  constructor() {
    this.rest = new REST().setToken(process.env.DISCORD_TOKEN);
    this.clientID = Buffer.from(
      process.env.DISCORD_TOKEN.split('.')[0],
      'base64'
    ).toString();
  }

  async loadCmds() {
    const ext = __filename.slice(-3);
    const cmds = await readdir(COMMAND_DIR)
      .then(files =>
        files
          .filter(f => f.endsWith(ext))
          .map(f => import(path.join(COMMAND_DIR, f)))
      )
      .then(Promise.all.bind(Promise))
      .then(imports =>
        (imports as {[key: string]: Command}[])
          .map(Object.values)
          .flat()
          .filter(o => Object.getPrototypeOf(o) === Command)
          .map(C => {
            const cmd = new C() as Command;
            return [cmd.name, cmd] as [string, Command];
          })
      );

    this.cmds = new Map(cmds);

    // pull registered commands from discord
    const registeredCmds = (await this.rest.get(
      Routes.applicationCommands(this.clientID)
    )) as APIApplicationCommand[];

    for (const cmd of registeredCmds) {
      this.registeredCmds.set(cmd.name, cmd);
    }
  }

  mc(name: string) {
    const fst = name.split(' ')[0].replace(/\//g, '');
    const cmd = this.registeredCmds.get(fst);
    return `<${name}:${cmd?.id || '1'}>`;
  }
}
