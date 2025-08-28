import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import { injectable } from 'tsyringe';
import { EventRegistry } from './EventRegistry';

@injectable()
export class Deserializer {
  deserialize(serializedEvent: SerializedEvent): Event {
    const metadata = EventRegistry.getByName(serializedEvent.event_name);
    if (!metadata) {
      throw new Error(`Unknown event type: ${serializedEvent.event_name}`);
    }

    const recordedOn = this.parseDateTime(serializedEvent.recorded_on);
    const payload = JSON.parse(serializedEvent.json_payload);

    const baseArgs = [
      this.parseString(serializedEvent.event_id),
      this.parseString(serializedEvent.aggregate_id),
      this.parseNumber(serializedEvent.aggregate_version),
      this.parseString(serializedEvent.correlation_id),
      this.parseString(serializedEvent.causation_id),
      recordedOn,
    ];

    const payloadArgs = Array.from(metadata.serializableProperties).map(
      (propertyKey) => payload[propertyKey],
    );

    return new metadata.constructor(...baseArgs, ...payloadArgs);
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

  private parseString(value: any): string {
    if (typeof value !== 'string') {
      throw new Error(`Expected string but got ${typeof value}`);
    }
    return value;
  }

  private parseNumber(value: any): number {
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Expected number but got ${typeof value}`);
    }
    return parsed;
  }

  private parseEnum<T extends { [key: string]: string }>(
    value: any,
    enumType: T,
    fieldName: string,
  ): T[keyof T] {
    if (typeof value !== 'string') {
      throw new Error(
        `Expected string for ${fieldName} but got ${typeof value}`,
      );
    }

    if (!Object.values(enumType).includes(value)) {
      throw new Error(
        `Invalid ${fieldName}: ${value}. Expected one of: ${Object.values(enumType).join(', ')}`,
      );
    }

    return value as T[keyof T];
  }
}
