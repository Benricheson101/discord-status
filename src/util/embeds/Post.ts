import {Incident} from 'statuspage.js';
import {capitalize} from '..';
import {BaseEmbed} from './Base';

export class PostModeEmbed extends BaseEmbed {
  constructor(public incident: Incident) {
    super(incident);

    const i = incident.incident_updates[0];

    this.fields = [
      {
        name: `${super.constructor.getStatusEmoji(i.status)} ${capitalize(
          i.status
        )}`,
        value: i.body,
      },
    ];

    this.footer = {
      text: `Started on ${super.formatDate(
        incident.created_at
      )}\nUpdated at ${super.formatDate(incident.updated_at)}`,
    };
  }
}
