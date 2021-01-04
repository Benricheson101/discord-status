import {EmbedBuilder} from '../EmbedBuilder';
import {emojis} from '..';
import {ComponentStatus, IncidentStatus, Indicator} from 'statuspage.js';
import {Incident} from 'statuspage.js';
import dayjs from 'dayjs';

export abstract class BaseEmbed extends EmbedBuilder {
  ['constructor']!: typeof BaseEmbed;

  author = {
    name: 'Discord Status',
    icon_url: 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
    url: 'https://s.red-panda.red/discord', // TODO: pull from config
  };

  constructor(public incident: Incident) {
    super();

    if (incident.name.length <= 256) {
      this.title = incident.name;
    } else {
      this.title = 'Discord Status Update';
      this.description = `**${incident.name}**`;
    }

    this.url = incident.shortlink;
    this.color = this.constructor.getColor(incident.incident_updates[0].status);
    this.footer = {
      text: `Started on ${this.formatDate(incident.created_at)}`,
    };
  }

  formatDate(d: Date): string {
    return dayjs(d).format('MMMM Do, YYYY [at] h:mm:ss A (z)');
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

  static getColor(
    status: Indicator | IncidentStatus | ComponentStatus
  ): number {
    switch (status) {
      case 'none':
      case 'resolved':
      case 'operational':
        return 4437377; // green

      case 'minor':
      case 'monitoring':
      case 'degraded_performance':
        return 15922754; // yellow

      case 'partial_outage':
      case 'investigating':
        return 15571250; // orange

      case 'major':
      case 'identified':
      case 'major_outage':
      case 'critical':
        return 15816754; // red

      case 'postmortem':
      default:
        return 4360181; // light blue
    }
  }
}
