import 'reflect-metadata';
import { Event } from '../event';

type EventConstructor<T extends Event = Event> = new (options: any) => T;

export function EventType(eventName: string) {
  return function <T extends Event>(constructor: EventConstructor<T>) {
    Reflect.defineMetadata('eventName', eventName, constructor);

    const { MetadataAutoSerializer } = require('./MetadataAutoSerializer');
    MetadataAutoSerializer.registerEventType(eventName, constructor);

    return constructor;
  };
}

export { EventConstructor };
