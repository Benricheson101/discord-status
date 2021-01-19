/* eslint-disable node/no-unsupported-features/node-builtins */

import {ApplicationCommand} from 'slashy';
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

export const inviteUrl = (): string | undefined => {
  const clientId =
    global.config.oauth?.client_id ||
    global.config.slash_commands?.application_id ||
    process.env.CLIENT_ID! ||
    process.env.APPLICATION_ID!;

  const redirectUri =
    global.config.oauth?.redirect_uri || process.env.REDIRECT_URI!;

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=webhook.incoming%20applications.commands`;

  return clientId && redirectUri && inviteUrl;
};

export const emojis = {
  red: '<:statusred:797222239661457478>',
  orange: '<:statusorange:797222239979700263>',
  yellow: '<:statusyellow:797222239522390056>',
  green: '<:statusgreen:797222239418187786>',
  blue: '<:statusblue:797222239942475786>',
};

export function getStatusEmoji(
  status: Indicator | IncidentStatus | ComponentStatus
): string {
  switch (status) {
    case 'none':
    case 'resolved':
    case 'operational':
      return emojis.green;

    case 'minor':
    case 'monitoring':
    case 'degraded_performance':
      return emojis.yellow;

    case 'major':
    case 'partial_outage':
    case 'investigating':
      return emojis.orange;

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
