export {
  type EventStore,
  type AggregateAndEventIdsInLastEvent,
  Hydrator,
  type Constructor,
  type EventData,
  schema_EventData,
};

import {
  CreationEvent,
  TransformationEvent,
  EventInfo,
  Event,
  Aggregate,
  Id,
} from '@/lib/eventSourcing/event';
import { Json } from '@/lib/json/types';
import { Schema } from '@/lib/json/schema';
import * as s from '@/lib/json/schema';
import * as d from '@/lib/json/decoder';
import { POSIX } from '@/lib/time';
import { Result, Failure } from '@/lib/Result';

/* Note [Event Store]

  The Event Store is responsible for saving new Events and fetching existing
  Events to hydrate / reconstitute Aggregates.

  The Event Store saves Events, but it does not save them directly, it first
  converts them to a SerializedEvent. The SerializedEvent is a representation of
  the Event that can be stored in a database.

  Additionally, the Event Store does not simply return aggregates, but it
  returns an Aggregate plus Event Ids, that would be necessary to append more
  events to the Aggregate (event_id and correlation_id in the last event of that Aggregate).

*/

interface AggregateAndEventIdsInLastEvent<T extends Aggregate<T>> {
  aggregate: T;
  eventIdOfLastEvent: Id<Event<T>>;
  correlationIdOfLastEvent: Id<Event<T>>;
}

interface EventStore {
  findAggregate<T extends Aggregate<T>>(
    aggregateId: string,
  ): Promise<AggregateAndEventIdsInLastEvent<T>>;

  saveEvent(event: Event<any>): Promise<void>;

  doesEventAlreadyExist(eventId: string): Promise<boolean>;
}

// -----------------------------------------------------------------------

// Serialized representation of an event.
type Serialized<P> = s.Infer<ReturnType<typeof schema_Serialized<P>>>;

const schema_Serialized = <Payload>(payload: Schema<Payload>) =>
  s.object({
    event_id: Id.schema<Event<Aggregate<any>>>(),
    aggregate_id: Id.schema<Aggregate<any>>(),
    aggregate_version: s.number,
    correlation_id: Id.schema<Event<Aggregate<any>>>(),
    causation_id: Id.schema<Event<Aggregate<any>>>(),
    recorded_on: POSIX.schema,
    payload,
  });

// -----------------------------------------------------------------------

// Convenient runtime representation of data in a serialized event.
type EventData<E> = { info: EventInfo; event: E };

function toSerialized<P>({
  info,
  event,
}: {
  info: EventInfo;
  event: P;
}): Serialized<P> {
  return { ...info, payload: event };
}

function fromSerialized<P>(serialized: Serialized<P>): {
  info: EventInfo;
  event: P;
} {
  const { payload, ...info } = serialized;
  return { info, event: payload };
}

const schema_EventData = <E>(s: Schema<E>): Schema<EventData<E>> =>
  schema_Serialized(s).dimap(fromSerialized, toSerialized);

// -----------------------------------------------------------------------

type Constructor<T> = new (...args: any[]) => T;

type Schemas<T extends Aggregate<T>> = {
  creation: Schema<EventData<CreationEvent<T>>>;
  transformation: Schema<EventData<TransformationEvent<T>>>;
};

/* Note [Hydrator]

  We need some type-safe way to decode events for an aggregate. That is, without casting.
  We perform type-directed decoding, where we specify the type of the aggregate,
  then use the decoders we have for creation and transformation events for that aggregate.

  This ensures that we will never apply an incorrect aggregate transformation or create
  an aggregate of the incorrect type.
*/
class Hydrator {
  private tmap = new Map<Constructor<any>, Schemas<any>>();

  constructor() {}

  // add support for deserializing an aggregate's events.
  add<A extends Aggregate<A>>({
    aggregate,
    creation,
    transformation,
  }: {
    aggregate: Constructor<A>;
    creation: Schema<CreationEvent<A>>;
    transformation: Schema<TransformationEvent<A>>;
  }): void {
    this.tmap.set(aggregate, {
      creation: schema_EventData(creation),
      transformation: schema_EventData(transformation),
    });
  }

  // Build an aggregate from all its serialized events.
  hydrate<A extends Aggregate<A>>(
    cls: Constructor<A>,
    serialized: Json[],
  ): Result<string, { aggregate: A; lastEvent: EventInfo }> {
    const schemas = this.tmap.get(cls) as undefined | Schemas<A>;
    if (schemas == undefined) {
      throw new Error(`Unknown aggregate ${cls.name}`);
    }

    if (serialized.length === 0) {
      return Failure('No events');
    }

    return d
      .decode(serialized[0], schemas.creation.decoder)
      .then(({ payload: first, info }) =>
        d
          .decode(serialized.slice(1), d.array(schemas.transformation.decoder))
          .map((es) => {
            let aggregate = first.createAggregate();
            let lastEvent = info;

            for (const t of es) {
              aggregate = t.payload.transformAggregate(aggregate);
              lastEvent = t.info;
            }

            return { aggregate, lastEvent };
          }),
      );
  }
}
