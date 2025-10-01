import {
  Aggregate,
  Id,
  CreationEvent,
  TransformationEvent,
  toSchema,
  EventClass,
} from '@/lib/eventSourcing/event';

import * as s from '@/lib/json/schema';

class User implements Aggregate<User> {
  constructor(
    readonly aggregateId: Id<User>,
    readonly aggregateVersion: number,
    readonly name: string,
  ) {}
}

export class CreateUser implements CreationEvent<CreateUser, User> {
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

export class AddName implements TransformationEvent<AddName, User> {
  static type: 'AddName' = 'AddName';
  constructor(readonly values: s.Infer<typeof AddName.schemaArgs>) {}

  static schemaArgs = s.object({
    type: s.stringLiteral(AddName.type),
    aggregateId: Id.schema(),
    name: s.string,
  });

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

export class RemoveName implements TransformationEvent<RemoveName, User> {
  static type = 'RemoveName' as const;
  static args = s.object({
    type: s.stringLiteral(this.type),
    aggregateId: Id.schema(),
    name: s.string,
  });
  static schema = toSchema(this, this.args);
  readonly schema = RemoveName.schema;
  constructor(readonly values: s.Infer<typeof RemoveName.args>) {}

  transformAggregate(agg: User): User {
    const u = new User(
      agg.aggregateId,
      agg.aggregateVersion + 1,
      this.values.name,
    );
    return u;
  }
}

import { Schema } from '@/lib/json/schema';
import { Constructor } from '@/lib/eventSourcing/eventStore';

class EntryC<
  A extends Aggregate<A>,
  E extends CreationEvent<E, A>,
  T extends E['values']['type'],
> {
  constructor(
    public c: Constructor<A>,
    public e: Schema<E>,
    public t: T,
  ) {}
}

class EntryT<
  A extends Aggregate<A>,
  E extends TransformationEvent<E, A>,
  T extends E['values']['type'],
> {
  constructor(
    public c: Constructor<A>,
    public e: Schema<E>,
    public t: T,
  ) {}
}

type Entry<
  A extends Aggregate<A>,
  E extends EventClass<E, A>,
  T extends E['values']['type'],
> =
  E extends CreationEvent<E, A>
    ? EntryC<A, E, T>
    : E extends TransformationEvent<E, A>
      ? EntryT<A, E, T>
      : never;

type Obj = Record<string, Entry<any, any, any>>;

function take(_: Obj): number {
  return 2;
}

take({
  [CreateUser.type]: new EntryC(User, CreateUser.schema, CreateUser.type),
});
