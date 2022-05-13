import {EmbedBuilder} from '../EmbedBuilder';
import {ComponentStatus, IncidentStatus, Indicator} from 'statuspage.js';
import {Incident} from 'statuspage.js';
import dayjs from 'dayjs';

export abstract class BaseEmbed extends EmbedBuilder {
  ['constructor']!: typeof BaseEmbed;

  author = {
    name: 'Discord Status',
    icon_url: 'https://discord.com/assets/f9bb9c4af2b9c32a2c5ee0014661546d.png',
    url: global.config.meta?.support_server
      ? `https://discord.gg/${global.config.meta?.support_server}`
      : '',
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

    this.timestamp = new Date(incident.created_at);
    this.footer = {
      text: 'Started',
    };
  }

  formatDate(d: Date): string {
    return dayjs(d).format('MMMM Do, YYYY [at] h:mm:ss A (z)');
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
        return 15920962; // yellow

      case 'major':
      case 'partial_outage':
      case 'investigating':
        return 15571250; // orange

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
