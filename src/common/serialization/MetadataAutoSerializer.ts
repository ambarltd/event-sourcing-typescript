import 'reflect-metadata';
import { Event } from '../event';
import { SerializedEvent } from '../serializedEvent';
import { injectable } from 'tsyringe';
import { EventConstructor } from './decorators';

@injectable()
export class MetadataAutoSerializer {
  private static eventTypeMap = new Map<string, EventConstructor>();
  private static eventNameMap = new Map<EventConstructor, string>();

  static registerEventType(eventName: string, eventClass: EventConstructor) {
    this.eventTypeMap.set(eventName, eventClass);
    this.eventNameMap.set(eventClass, eventName);
    console.log(`Registered event type: ${eventName} -> ${eventClass.name}`);
  }

  serialize(event: Event): SerializedEvent {
    const eventName = this.getEventName(event);
    const payload = this.extractPayloadViaReflection(event);

    return {
      event_id: event.eventId,
      aggregate_id: event.aggregateId,
      aggregate_version: event.aggregateVersion,
      correlation_id: event.correlationId,
      causation_id: event.causationId,
      recorded_on: this.formatDateTime(event.recordedOn),
      event_name: eventName,
      json_payload: JSON.stringify(payload),
      json_metadata: '{}',
    };
  }

  deserialize(serializedEvent: SerializedEvent): Event {
    const EventClass = MetadataAutoSerializer.eventTypeMap.get(
      serializedEvent.event_name,
    );
    if (!EventClass) {
      throw new Error(
        `Unknown event type: ${serializedEvent.event_name}. Available types: ${Array.from(MetadataAutoSerializer.eventTypeMap.keys()).join(', ')}`,
      );
    }

    const payload = JSON.parse(serializedEvent.json_payload);
    return this.constructEventViaReflection(EventClass, {
      eventId: serializedEvent.event_id,
      aggregateId: serializedEvent.aggregate_id,
      aggregateVersion: serializedEvent.aggregate_version,
      correlationId: serializedEvent.correlation_id,
      causationId: serializedEvent.causation_id,
      recordedOn: this.parseDateTime(serializedEvent.recorded_on),
      ...payload,
    });
  }

  private getEventName(event: Event): string {
    const eventName = Reflect.getMetadata(
      'eventName',
      event.constructor as EventConstructor,
    );
    if (!eventName) {
      throw new Error(
        `Event type not registered with @EventType: ${event.constructor.name}`,
      );
    }
    return eventName;
  }

  private extractPayloadViaReflection(event: Event): Record<string, any> {
    const payload: Record<string, any> = {};
    const baseProperties = [
      'eventId',
      'aggregateId',
      'aggregateVersion',
      'correlationId',
      'causationId',
      'recordedOn',
    ];

    for (const key in event) {
      if (!baseProperties.includes(key) && event.hasOwnProperty(key)) {
        payload[key] = (event as any)[key];
      }
    }

    const proto = Object.getPrototypeOf(event);
    Object.getOwnPropertyNames(proto).forEach((key) => {
      if (!baseProperties.includes(key) && key !== 'constructor') {
        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (descriptor && descriptor.get) {
          payload[key] = (event as any)[key];
        }
      }
    });

    return payload;
  }

  private constructEventViaReflection(
    EventClass: EventConstructor,
    data: Record<string, any>,
  ): Event {
    return new EventClass(data);
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('Z', ' UTC');
  }

  private parseDateTime(dateStr: string): Date {
    if (!dateStr.endsWith(' UTC')) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const parsed = new Date(dateStr.slice(0, -4) + 'Z');
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return parsed;
  }
}
