/* eslint-disable node/no-unsupported-features/node-builtins */

import {ApplicationCommand} from './Interaction';
import {resolve} from 'path';
import {promises} from 'fs';
const {readdir} = promises;

export async function allCmdJson(dir: string): Promise<ApplicationCommand[]> {
  console.log('allCmdJson function call');
  const files = await readdir(dir, {encoding: 'utf-8', withFileTypes: true});
  const jsonFiles = files.map(f => f.name).filter(f => f.endsWith('.json'));

  const json: ApplicationCommand[] = [];

  for (const file of jsonFiles) {
    const f = await import(resolve(dir, file));

    json.push(f);
  }
  return json;
}
