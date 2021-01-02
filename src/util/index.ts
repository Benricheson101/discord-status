/* eslint-disable node/no-unsupported-features/node-builtins */

import {ApplicationCommand} from './Interaction';
import {resolve} from 'path';
import {promises} from 'fs';
import {
  ComponentStatus,
  IncidentStatus,
  Indicator,
} from 'statuspage.js/build/src/types';
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
  .env
  .APPLICATION_ID!}&redirect_uri=https://test.red-panda.red/auth/callback&response_type=code&scope=webhook.incoming%20applications.commands`;

export const emojis = {
  green: '<:statusgreen:793333655493279764>',
  yellow: '<:statusyellow:793333655157735435>',
  red: '<:statusred:793333655430627358>',
  blue: '<:statusblue:793333655451205652>',
};

export function statusEmojis(
  status: Indicator | IncidentStatus | ComponentStatus
): string {
  switch (status) {
    case 'none':
    case 'resolved':
    case 'operational':
      return emojis.green;

    case 'minor':
    case 'monitoring':
    case 'investigating': // TODO: orange
    case 'degraded_performance':
    case 'partial_outage': // TODO: orange
      return emojis.yellow;

    case 'major':
    case 'identified':
    case 'major_outage':
    case 'critical':
      return emojis.red;

    case 'postmortem':
      return emojis.blue;
  }
}

export function statusToWords(
  status: Indicator | IncidentStatus | ComponentStatus
): string {
  switch (status) {
    case 'degraded_performance':
      return 'degraded performance';

    case 'partial_outage':
      return 'partial outage';

    case 'major_outage':
      return 'major outage';

    default:
      return status;
  }
}

export function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
