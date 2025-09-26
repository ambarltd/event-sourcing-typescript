export {
  type EventStore,
  type AggregateAndEventIdsInLastEvent,
  Hydrator,
  type Constructor,
  type EventData,
  schema_EventData,
  makeSchema,
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
import { Encoder } from '@/lib/json/encoder';
import { Decoder } from '@/lib/json/decoder';
import * as s from '@/lib/json/schema';
import * as d from '@/lib/json/decoder';
import { POSIX } from '@/lib/time';
import { Result, Failure } from '@/lib/Result';
import { DateTime } from 'luxon';

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
  find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<{ aggregate: T; lastEvent: EventInfo }>;

  save<E extends Event<T>, T extends Aggregate<T>>(args: {
    aggregate: Constructor<T>;
    event: CreationEvent<E, T> | TransformationEvent<E, T>;
    event_id?: Id<Event<T>>;
    correlation_id?: Id<Event<T>>;
    causation_id?: Id<Event<T>>;
  }): Promise<void>;

  doesEventAlreadyExist(eventId: Id<Event<any>>): Promise<boolean>;
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
    recorded_on: schema_UTC,
    payload: schema_StringifiedJSON(payload),
  });

const schema_UTC: s.Schema<POSIX> = s.string.then(
  (s) => {
    const date = DateTime.fromISO(s, { zone: 'UTC' });
    return date.isValid
      ? d.succeed(new POSIX(date.toMillis()))
      : d.fail(`Invalid ISO date: ${s}`);
  },
  (s) => {
    const { date, time } = s.toUTCDateAndTime();
    return `${date.pretty()}T${time.pretty()}Z`;
  },
);

const schema_StringifiedJSON = <T>(inner: s.Schema<T>): s.Schema<T> =>
  s.string.then(
    (str: string): Decoder<T> =>
      new Decoder((_: unknown) => inner.decoder.run(JSON.parse(str))),
    (t: T): string => JSON.stringify(inner.encoder.run(t)),
  );

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
  creation: Schema<EventData<CreationEvent<any, T>>>;
  transformation: Schema<EventData<TransformationEvent<any, T>>>;
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
    creation: Schema<CreationEvent<any, A>>;
    transformation: Schema<TransformationEvent<any, A>>;
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
      .then(({ event: first, info }) =>
        d
          .decode(serialized.slice(1), d.array(schemas.transformation.decoder))
          .map((es) => {
            let aggregate = first.createAggregate();
            let lastEvent = info;

            for (const t of es) {
              aggregate = t.event.transformAggregate(aggregate);
              lastEvent = t.info;
            }

            return { aggregate, lastEvent };
          }),
      );
  }
}

// -----------------------------------------------------------------------

type EventConstructor = { type: string; schema: Schema<any> };

// Create an efficient schema given a list of event classes
//
// To be used when joining schemas for the Hydrator
function makeSchema<T extends [...EventConstructor[]]>(
  ts: T,
): Schema<s.Infer<T[number]['schema']>> {
  type Ty = s.Infer<T[number]['schema']>;

  const decoder: Decoder<Ty> = d
    .object({ type: d.string })
    .then(({ type: ty }) => {
      const c: undefined | EventConstructor = ts.find((t) => t.type === ty);

      if (c === undefined) return d.fail(`Unknown event type: ${ty}`);

      return c.schema.decoder as Decoder<Ty>;
    });

  const encoder: Encoder<Ty> = new Encoder((v: Ty) => {
    const ty = ts.find((t) => t.type === v.type);
    if (ty === undefined) {
      throw new Error(`Unable to encode unknown event type: ${v.type}`);
    }

    return ty.schema.encoder.run(v);
  });

  return new Schema(decoder, encoder);
}
