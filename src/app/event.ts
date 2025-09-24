import {
  Aggregate,
  Id,
  CreationEvent,
  TransformationEvent,
} from '@/lib/eventSourcing/event';

import { Decoder } from '@/lib/json/decoder';
import * as s from '@/lib/json/schema';
import * as d from '@/lib/json/decoder';
import { Schema } from '@/lib/json/schema';
import { Maybe, Nothing, Just } from '@/lib/Maybe';
import * as m from '@/lib/Maybe';

class User implements Aggregate<User> {
  constructor(
    readonly aggregateId: Id<User>,
    readonly aggregateVersion: number,
    readonly name: string,
  ) {}
}

class CreateUser implements CreationEvent<User> {
  static type: 'CreateUserr' = 'CreateUserr';
  constructor(readonly values: s.Infer<typeof CreateUser.schemaArgs>) {}
  static schemaArgs = s.object({
    type: s.stringLiteral(CreateUser.type),
    name: s.string,
  });

  static schema = CreateUser.schemaArgs.dimap(
    (v) => new CreateUser(v),
    (v) => v.values,
  );

  createAggregate() {
    return new User(new Id('wat'), 0, this.values.name);
  }
}

class AddName implements TransformationEvent<User> {
  static type: 'AddName' = 'AddName';
  constructor(readonly values: s.Infer<typeof AddName.schemaArgs>) {}

  static schemaArgs = s.object({
    type: s.stringLiteral(AddName.type),
    name: s.string,
  });

  static schema = AddName.schemaArgs.dimap(
    (v) => new AddName(v),
    (v) => v.values,
  );

  transformAggregate(agg: User): User {
    const u = new User(
      agg.aggregateId,
      agg.aggregateVersion + 1,
      this.values.name,
    );
    return u;
  }
}

function decodeEvent<T>(
  ts: Array<{ schemaS: Schema<T>; type: string }>,
): Decoder<Maybe<T>> {
  return d.object({ type: d.string }).then(({ type: ty }) => {
    const found = ts.find((t) => t.type == ty);
    if (found === undefined) {
      return d.succeed(Nothing());
    }

    return found.schemaS.decoder.map(Just) as Decoder<Maybe<T>>;
  });
}

type Accepted<T extends { [D in keyof T]: Decoder<any> }> = d.Infer<T[keyof T]>;

type W = d.Infer<typeof dd>;

const dd = accept({
  [AddName.type]: AddName.schema.decoder,
  [CreateUser.type]: CreateUser.schema.decoder,
});

function accept<T extends { [D in keyof T]: Decoder<any> }>(
  ds: T,
): Decoder<Maybe<Accepted<T>>> {
  return d
    .object({ type: d.string })
    .then(({ type: ty }): Decoder<Maybe<Accepted<T>>> => {
      const decoder: undefined | Decoder<Accepted<T>> = ds[ty as keyof T];
      return (decoder ? decoder.map(Just) : d.succeed(Nothing())) as Decoder<
        Maybe<Accepted<T>>
      >;
    });
}

// ----------

type Accepted2<T extends [...unknown[]]> = T[number];

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
