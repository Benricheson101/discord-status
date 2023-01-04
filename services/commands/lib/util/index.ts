import {ComponentStatus, IncidentStatus, Indicator} from 'statuspage.js';

export * from './responses';

const EMOJI_RED = '<:statusred:797222239661457478>';
const EMOJI_ORANGE = '<:statusorange:797222239979700263>';
const EMOJI_YELLOW = '<:statusyellow:797222239522390056>';
const EMOJI_GREEN = '<:statusgreen:797222239418187786>';
const EMOJI_BLUE = '<:statusblue:797222239942475786>';

export const getStatusEmoji = (
  status: Indicator | IncidentStatus | ComponentStatus
): string => {
  switch (status) {
    case 'none':
    case 'resolved':
    case 'operational':
      return EMOJI_GREEN;

    case 'minor':
    case 'monitoring':
    case 'degraded_performance':
      return EMOJI_YELLOW;

    case 'major':
    case 'partial_outage':
    case 'investigating':
      return EMOJI_ORANGE;

    case 'identified':
    case 'major_outage':
    case 'critical':
      return EMOJI_RED;

    case 'postmortem':
      return EMOJI_BLUE;
  }
};

export const formatStatus = (
  status: Indicator | IncidentStatus | ComponentStatus
): string => status.replace(/_/g, ' ');

export const capitalize = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);
