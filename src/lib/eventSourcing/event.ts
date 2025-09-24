export {
  Event,
  type Aggregate,
  TransformationEvent,
  CreationEvent,
  type EventInfo,
  EventInfo_schema,
  Id,
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
interface Aggregate<T> {
  readonly aggregateId: Id<Aggregate<T>>;
  readonly aggregateVersion: number;
}

// Class which all events derive from. Used for type constraints.
abstract class Event<_T extends Aggregate<_T>> {}

// The first event for an aggregate.
abstract class CreationEvent<T extends Aggregate<T>> extends Event<T> {
  abstract createAggregate(): T;
}

// Any event that is not the first one for an aggregate.
abstract class TransformationEvent<T extends Aggregate<T>> extends Event<T> {
  abstract transformAggregate(aggregate: T): T;
}

// Information about an event. Not the event payload.
type EventInfo = s.Infer<typeof EventInfo_schema>;

const EventInfo_schema = s.object({
  event_id: Id.schema<Event<Aggregate<any>>>(),
  aggregate_id: Id.schema<Aggregate<any>>(),
  aggregate_version: s.number,
  correlation_id: Id.schema<Event<Aggregate<any>>>(),
  causation_id: Id.schema<Event<Aggregate<any>>>(),
  recorded_on: POSIX.schema,
});
