export {
  Event,
  Aggregate,
  TransformationEvent,
  CreationEvent,
  type EventInfo,
  EventInfo_schema,
};

import * as s from '@/lib/json/schema';
import { Schema } from '@/lib/json/schema';
import { POSIX } from '@/lib/time';

// @ts-ignore
class Id<A> {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;

  constructor(public value: string) {}

  static schema<A>(): Schema<Id<A>> {
    return s.string.dimap(
      (v) => new Id(v),
      (id) => id.value,
    );
  }
}

// Class which all events derive from. Used for type constraints.
abstract class Aggregate {}

// Class which all events derive from. Used for type constraints.
abstract class Event<_T extends Aggregate> {}

// The first event for an aggregate.
abstract class CreationEvent<T extends Aggregate> extends Event<T> {
  abstract createAggregate(): T;
}

// Any event that is not the first one for an aggregate.
abstract class TransformationEvent<T extends Aggregate> extends Event<T> {
  abstract transformAggregate(aggregate: T): T;
}

// Information about an event. Not the event payload.
type EventInfo = s.Infer<typeof EventInfo_schema>;

const EventInfo_schema = s.object({
  event_id: Id.schema<Event<Aggregate>>(),
  aggregate_id: Id.schema<Aggregate>(),
  aggregate_version: s.number,
  correlation_id: Id.schema<Event<Aggregate>>(),
  causation_id: Id.schema<Event<Aggregate>>(),
  recorded_on: POSIX.schema,
});
