/* eslint-disable node/no-unsupported-features/node-builtins */

import {ApplicationCommand} from './Interaction';
import {resolve} from 'path';
import {promises} from 'fs';
const {readdir} = promises;

export async function allCmdJson(
  dir: string,
  ignore = ['help_text.json']
): Promise<ApplicationCommand[]> {
  const files = await readdir(dir, {encoding: 'utf-8', withFileTypes: true});
  const jsonFiles = files
    .map(f => f.name)
    .sort()
    .filter(f => f.endsWith('.json') && !ignore.includes(f));

  const json: ApplicationCommand[] = [];

  for (const file of jsonFiles) {
    const f = await import(resolve(dir, file));

    json.push(f);
  }
  return json;
}

export const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${process
  .env.APPLICATION_ID!}&scope=applications.commands`;
