import {Incident, IncidentUpdates} from 'statuspage.js';
import {BaseEmbed} from './Base';
import {EmbedJSON} from '../EmbedBuilder';
import {capitalize} from '..';
import dayjs from 'dayjs';

export class EditModeEmbed extends BaseEmbed {
  constructor(public incident: Incident) {
    super(incident);

    this.fields = [...incident.incident_updates] // copy cus arrays are mutable
      .reverse()
      .map(this.formatFields)
      .slice(-25);
  }

  formatFields(update: IncidentUpdates): NonNullable<EmbedJSON['fields']>[0] {
    return {
      name: `${super.constructor.getStatusEmoji(update.status)} ${capitalize(
        update.status
      )} (${dayjs(update.updated_at).format('h:mm:ss A z')})`,
      value: update.body || 'no information available.',
    };
  }
}
