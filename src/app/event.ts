export { accept };

import {
  Aggregate,
  Id,
  CreationEvent,
  TransformationEvent,
  Event,
  EventInfo,
} from '@/lib/eventSourcing/event';

import { Decoder } from '@/lib/json/decoder';
import { Encoder } from '@/lib/json/encoder';
import * as s from '@/lib/json/schema';
import * as d from '@/lib/json/decoder';
import { Schema } from '@/lib/json/schema';
import { Json } from '@/lib/json/types';
import { Maybe, Nothing, Just } from '@/lib/Maybe';
import { Result, Failure } from '@/lib/Result';
import * as m from '@/lib/Maybe';
import { POSIX } from '@/lib/time';

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

function toSerialized<P>({
  info,
  payload,
}: {
  info: EventInfo;
  payload: P;
}): Serialized<P> {
  return { ...info, payload };
}

function fromSerialized<P>(serialized: Serialized<P>): {
  info: EventInfo;
  payload: P;
} {
  const { payload, ...info } = serialized;
  return { info, payload };
}

type EventData<E> = { info: EventInfo; payload: E };

const schema_EventData = <E>(s: Schema<E>): Schema<EventData<E>> =>
  schema_Serialized(s).dimap(fromSerialized, toSerialized);

type Constructor<T> = new (...args: any[]) => T;

type Schemas<T extends Aggregate<T>> = {
  creation: Schema<EventData<CreationEvent<T>>>;
  transformation: Schema<EventData<TransformationEvent<T>>>;
};

type EventName = string;

class Deserializer {
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

  deserialize<A extends Aggregate<A>>(
    aggregate: Constructor<A>,
    serialized: Json[],
  ): Result<string, { aggregate: A; lastEvent: EventInfo }> {
    const schemas = this.tmap.get(aggregate) as undefined | Schemas<A>;
    if (schemas == undefined) {
      throw new Error(`Unknown aggregate ${aggregate.name}`);
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

class User implements Aggregate<User> {
  constructor(
    readonly aggregateId: Id<User>,
    readonly aggregateVersion: number,
    readonly name: string,
  ) {}
}

class Other implements Aggregate<Other> {
  constructor(
    readonly aggregateId: Id<Other>,
    readonly aggregateVersion: number,
  ) {}
}

class CreateUser implements CreationEvent<CreateUser, User> {
  static type: 'CreateUserr' = 'CreateUserr';
  static schemaArgs = s.object({
    type: s.stringLiteral(CreateUser.type),
    aggregateId: Id.schema(),
    name: s.string,
  });
  static schema = CreateUser.schemaArgs.dimap(
    (v) => new CreateUser(v),
    (v) => v.values,
  );

  schema = CreateUser.schema;
  constructor(readonly values: s.Infer<typeof CreateUser.schemaArgs>) {}
  createAggregate() {
    return new User(new Id('wat'), 0, this.values.name);
  }
}

class AddName implements TransformationEvent<AddName, User> {
  static type: 'AddName' = 'AddName';
  constructor(readonly values: s.Infer<typeof AddName.schemaArgs>) {}

  static schemaArgs = s.object({
    type: s.stringLiteral(AddName.type),
    aggregateId: Id.schema(),
    name: s.string,
  });

  encoder = AddName.schema.encoder as Encoder<Event<User>>;

  static schema = AddName.schemaArgs.dimap(
    (v) => new AddName(v),
    (v) => v.values,
  );
  readonly schema = AddName.schema;

  transformAggregate(agg: User): User {
    const u = new User(
      agg.aggregateId,
      agg.aggregateVersion + 1,
      this.values.name,
    );
    return u;
  }
}

class RemoveName implements TransformationEvent<RemoveName, User> {
  static type: 'RemoveName' = 'RemoveName';
  constructor(readonly values: s.Infer<typeof AddName.schemaArgs>) {}

  static schemaArgs = s.object({
    type: s.stringLiteral(AddName.type),
    aggregateId: Id.schema(),
    name: s.string,
  });

  encoder = RemoveName.schema.encoder as Encoder<Event<User>>;
  static schema = AddName.schemaArgs.dimap(
    (v) => new AddName(v),
    (v) => v.values,
  );
  readonly schema = AddName.schema;

  transformAggregate(agg: User): User {
    const u = new User(
      agg.aggregateId,
      agg.aggregateVersion + 1,
      this.values.name,
    );
    return u;
  }
}

// ----------

const vv = accept([AddName, CreateUser]);

type WW = m.Infer<d.Infer<typeof vv>>;

type EventClass = { type: string; schema: Schema<any> };

// Given some event classes, creates a decoder for those classes.
// Makes sure to error if decoding those class object fail, but
// succeeds if the encoded event was of another class.
function accept<T extends [...EventClass[]]>(
  ts: T,
): Decoder<Maybe<s.Infer<T[number]['schema']>>> {
  type Ty = s.Infer<T[number]['schema']>;
  return d.object({ type: d.string }).then(({ type: ty }) => {
    const c: undefined | EventClass = ts.find((t) => t.type === ty);
    return c
      ? (c.schema.decoder.map(Just) as Decoder<Maybe<Ty>>)
      : d.succeed(Nothing());
  });
}

// Create a schema given a list of event classes
function makeSchema<T extends [...EventClass[]]>(
  ts: T,
): Schema<s.Infer<T[number]['schema']>> {
  type Ty = s.Infer<T[number]['schema']>;

  const decoder: Decoder<Ty> = d
    .object({ type: d.string })
    .then(({ type: ty }) => {
      const c: undefined | EventClass = ts.find((t) => t.type === ty);

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

const ww = new Deserializer();
ww.add<User>({
  aggregate: User,
  creation: makeSchema([CreateUser]).decoder,
  transformation: makeSchema([AddName, RemoveName]).decoder,
});
