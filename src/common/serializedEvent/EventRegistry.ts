import { Event } from '../event';

export interface EventConstructor {
  new (...args: any[]): Event;
}

export interface EventMetadata {
  constructor: EventConstructor;
  eventName: string;
  serializableProperties: Set<string>;
}

class EventRegistryClass {
  private eventsByName = new Map<string, EventMetadata>();
  private eventsByConstructor = new Map<EventConstructor, EventMetadata>();

  register(eventName: string, constructor: EventConstructor): void {
    const metadata: EventMetadata = {
      constructor,
      eventName,
      serializableProperties: new Set(),
    };

    this.eventsByName.set(eventName, metadata);
    this.eventsByConstructor.set(constructor, metadata);
  }

  addSerializableProperty(
    constructor: EventConstructor,
    propertyKey: string,
  ): void {
    const metadata = this.eventsByConstructor.get(constructor);
    if (metadata) {
      metadata.serializableProperties.add(propertyKey);
    }
  }

  getByName(eventName: string): EventMetadata | undefined {
    return this.eventsByName.get(eventName);
  }

  getByConstructor(constructor: EventConstructor): EventMetadata | undefined {
    return this.eventsByConstructor.get(constructor);
  }

  getEventName(event: Event): string {
    const metadata = this.eventsByConstructor.get(
      event.constructor as EventConstructor,
    );
    if (!metadata) {
      throw new Error(`Event type not registered: ${event.constructor.name}`);
    }
    return metadata.eventName;
  }
}

export const EventRegistry = new EventRegistryClass();

export function RegisterEvent(eventName: string) {
  return function <T extends EventConstructor>(constructor: T): T {
    EventRegistry.register(eventName, constructor);
    return constructor;
  };
}

export function Serializable(target: any, propertyKey: string): void {
  EventRegistry.addSerializableProperty(target.constructor, propertyKey);
}
