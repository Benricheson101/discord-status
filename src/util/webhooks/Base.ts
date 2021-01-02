import {EmbedBuilder} from '../EmbedBuilder';
import {emojis} from '..';
import {ComponentStatus, IncidentStatus, Indicator} from 'statuspage.js';
import {Interaction} from '../Interaction';

export abstract class BaseEmbed extends EmbedBuilder {
  author = {
    name: 'Discord Status',
    icon_url: 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
    url: 'https://s.red-panda.red/discord', // TODO: pull from config
  };

  constructor() {
    super();
  }

  static getStatusEmoji(
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

  abstract update(arg0: Interaction): Promise<unknown>;
}
