import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import { injectable } from 'tsyringe';
import { EventRegistry } from './EventRegistry';

@injectable()
export class Serializer {
  serialize(event: Event): SerializedEvent {
    return {
      event_id: event.eventId,
      aggregate_id: event.aggregateId,
      aggregate_version: event.aggregateVersion,
      correlation_id: event.correlationId,
      causation_id: event.causationId,
      recorded_on: this.formatDateTime(event.recordedOn),
      event_name: EventRegistry.getEventName(event),
      json_payload: this.createJsonPayload(event),
      json_metadata: '{}',
    };
  }

  private createJsonPayload(event: Event): string {
    const metadata = EventRegistry.getByConstructor(event.constructor as any);
    if (!metadata) {
      throw new Error(`Event type not registered: ${event.constructor.name}`);
    }

    const payload: Record<string, any> = {};

    for (const propertyKey of metadata.serializableProperties) {
      payload[propertyKey] = (event as any)[propertyKey];
    }

    return JSON.stringify(payload);
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('Z', ' UTC');
  }
}
