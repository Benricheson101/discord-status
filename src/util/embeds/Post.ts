import {Incident} from 'statuspage.js';
import {capitalize, getStatusEmoji} from '..';
import {BaseEmbed} from './Base';

export class PostModeEmbed extends BaseEmbed {
  constructor(public incident: Incident) {
    super(incident);

    const i = incident.incident_updates[0];

    this.fields = [
      {
        name: `${getStatusEmoji(i.status)} ${capitalize(i.status)}`,
        value: i.body,
      },
    ];

    this.footer = {
      text: `Updated: ${super.formatDate(incident.updated_at)}\nStarted`,
    };
  }
}
