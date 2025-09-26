import {
  Aggregate,
  Id,
  CreationEvent,
  TransformationEvent,
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
  static type: 'RemoveName' = 'RemoveName';
  constructor(readonly values: s.Infer<typeof RemoveName.schemaArgs>) {}

  static schemaArgs = s.object({
    type: s.stringLiteral(RemoveName.type),
    aggregateId: Id.schema(),
    name: s.string,
  });

  static schema = RemoveName.schemaArgs.dimap(
    (v) => new RemoveName(v),
    (v) => v.values,
  );
  readonly schema = RemoveName.schema;

  transformAggregate(agg: User): User {
    const u = new User(
      agg.aggregateId,
      agg.aggregateVersion + 1,
      this.values.name,
    );
    return u;
  }
}
