export { accept, type EventClass };

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
