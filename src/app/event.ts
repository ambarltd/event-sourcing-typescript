import {
  Aggregate,
  Id,
  CreationEvent,
  TransformationEvent,
  toSchema,
} from '@/lib/eventSourcing/event';

import * as s from '@/lib/json/schema';

class User implements Aggregate<User> {
  constructor(
    readonly aggregateId: Id<User>,
    readonly aggregateVersion: number,
    readonly name: string,
  ) {}
}

export class CreateUser implements CreationEvent<User> {
  static type: 'CreateUser' = 'CreateUser';
  static schemaArgs = s.object({
    type: s.stringLiteral(CreateUser.type),
    aggregateId: Id.schema(),
    name: s.string,
  });
  static schema = CreateUser.schemaArgs.dimap(
    (v) => new CreateUser(v),
    (v) => v.values,
  );
  static aggregate = User;

  schema = CreateUser.schema;
  constructor(readonly values: s.Infer<typeof CreateUser.schemaArgs>) {}
  createAggregate() {
    return new User(new Id('wat'), 0, this.values.name);
  }
}

export class AddName implements TransformationEvent<User> {
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

export class RemoveName implements TransformationEvent<User> {
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

import { Hydrator, EntryC } from '@/lib/eventSourcing/eventStore';

const hydrator = new Hydrator([
  new EntryC(User, CreateUser.schema, CreateUser.type),
]);
