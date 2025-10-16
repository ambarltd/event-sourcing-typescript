export { initialize, PostgresEventStore, type WithEventStore };

import { Json } from '@/lib/json/types';
import {
  Id,
  Event,
  Aggregate,
  CreationEvent,
  TransformationEvent,
  EventInfo,
} from '@/lib/eventSourcing/event';
import {
  EventStore,
  Schemas,
  Constructor,
  EventData,
} from '@/lib/eventSourcing/eventStore';
import { PostgresTransaction } from '@/lib/postgres';
import { log } from '@/common/util/Logger';
import { POSIX } from '@/lib/time';
import { Future } from '@/lib/Future';
import { TreeMap } from '@/lib/TreeMap';
import { Nullable } from '@/lib/Maybe';

type WithEventStore = <E, T>(
  onError: (e: Error) => E,
  f: (s: EventStore) => Future<E, T>,
) => Future<E, T>;

type LoadedAggregate<T extends Aggregate<T>> = {
  aggregate: T;
  lastEvent: EventInfo;
};

class PostgresEventStore implements EventStore {
  // This cache allows us to efficiently call `find` and `try_find` multiple
  // times within a transaction. This makes reactions and commands simpler as
  // there is no need to manually apply to the aggregate the transformations
  // performed by newly emitted events in those functions. Instead we can just
  // call `find` again and load the latest version of the aggregate for free.
  private cache: TreeMap<Id<Aggregate<unknown>>, LoadedAggregate<any>>;

  // An instance of this class never lives loger than the transaction
  // it is associated with.
  constructor(
    private transaction: PostgresTransaction,
    private readonly schemas: Schemas,
    private readonly eventStoreTable: string,
  ) {
    this.cache = TreeMap.new_();
  }

  async find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<T> {
    return (await this._find(cls, aggregateId)).aggregate;
  }

  async try_find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<T | null> {
    const found = await this._try_find(cls, aggregateId);
    return found ? found.aggregate : null;
  }

  private async _find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<LoadedAggregate<T>> {
    const found = await this._try_find(cls, aggregateId);

    if (found == null) {
      throw new Error(`Unknown aggregate ID ${aggregateId.value}`);
    }

    return found;
  }

  private async _try_find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<Nullable<LoadedAggregate<T>>> {
    const found = this.cache_load(aggregateId);
    if (found !== null) {
      return found;
    }

    const events = await this.findAll(aggregateId);

    if (events.length === 0) {
      return null;
    }

    const loaded = this.schemas.hydrate(cls, events).unwrap((e) => e);
    this.cache_save(loaded);
    return loaded;
  }

  async emit<T extends Aggregate<T>>(args: {
    aggregate: Constructor<T>;
    event: CreationEvent<T> | TransformationEvent<T>;
    event_id?: Id<Event<T>>;
    correlation_id?: Id<Event<T>>;
    causation_id?: Id<Event<T>>;
  }): Promise<{ event: Event<T>; info: EventInfo }> {
    const event = args.event;
    const event_id = args.event_id || Id.random();
    let info: EventInfo;
    let aggregate: T;
    switch (true) {
      case event instanceof CreationEvent: {
        aggregate = event.createAggregate();
        info = {
          event_id,
          aggregate_id: aggregate.aggregateId,
          aggregate_version: 0,
          correlation_id: args.correlation_id || event_id,
          causation_id: args.causation_id || event_id,
          recorded_on: POSIX.now(),
        };
        break;
      }
      case event instanceof TransformationEvent: {
        const found = await this._find(
          args.aggregate,
          event.values.aggregateId,
        );
        aggregate = found.aggregate;
        info = {
          event_id,
          aggregate_id: aggregate.aggregateId,
          aggregate_version: aggregate.aggregateVersion + 1,
          correlation_id: found.lastEvent.correlation_id,
          causation_id: found.lastEvent.causation_id,
          recorded_on: POSIX.now(),
        };
        break;
      }
      default:
        return event satisfies never;
    }

    await this.insert<Event<T>>({ info, event });
    this.cache_save({ aggregate, lastEvent: info });
    return { event, info };
  }

  async doesEventAlreadyExist(eventId: Id<Event<any>>): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM ${this.eventStoreTable}
      WHERE event_id = $1`;

    try {
      const result = await this.transaction.query(sql, [eventId.value]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to fetch event: ${eventId}: ${error}`);
    }
  }

  private async findAll<T extends Aggregate<T>>(
    aggregateId: Id<T>,
  ): Promise<Json[]> {
    const sql = `
      SELECT
          event_id,
          aggregate_id,
          aggregate_version,
          correlation_id,
          causation_id,
          recorded_on,
          payload,
          event_name
      FROM ${this.eventStoreTable}
      WHERE aggregate_id = $1
      ORDER BY aggregate_version ASC`;
    try {
      const result = await this.transaction.query(sql, [aggregateId.value]);
      return result.rows;
    } catch (error) {
      throw new Error(
        `Failed to fetch events for aggregate: ${aggregateId}: ${error}`,
      );
    }
  }

  private async insert<E extends Event<any>>(edata: EventData<E>) {
    const sql = `
      INSERT INTO ${this.eventStoreTable} (
          event_id,
          aggregate_id,
          aggregate_version,
          correlation_id,
          causation_id,
          recorded_on,
          payload,
          event_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

    const serialized = this.schemas.encode(edata);

    const values = [
      // @ts-ignore
      serialized.event_id,
      // @ts-ignore
      serialized.aggregate_id,
      // @ts-ignore
      serialized.causation_id,
      // @ts-ignore
      serialized.correlation_id,
      // @ts-ignore
      serialized.aggregate_version,
      // @ts-ignore
      serialized.payload,
      // @ts-ignore
      serialized.recorded_on,
      edata.event.values.type,
    ];

    try {
      await this.transaction.query(sql, values);
    } catch (error) {
      throw new Error(`Failed to save event: ${edata.info.event_id}: ${error}`);
    }
  }

  private cache_save<T extends Aggregate<T>>(loaded: LoadedAggregate<T>): void {
    this.cache.set(loaded.aggregate.aggregateId, loaded);
  }

  private cache_load<T extends Aggregate<T>>(
    id: Id<T>,
  ): Nullable<LoadedAggregate<T>> {
    return this.cache.get(id).asNullable();
  }
}

// Prepare the database to be used as an event store.
async function initialize({
  transaction,
  database,
  table,
  replicationUserName,
  replicationUserPass,
  replicationPublication,
}: {
  transaction: PostgresTransaction;
  database: string;
  table: string;
  replicationUserName: string;
  replicationUserPass: string;
  replicationPublication: string;
}): Promise<void> {
  function run(description: string, query: string) {
    log.info(description);
    log.info(query);
    return transaction.query(query);
  }

  await run(
    `Creating table ${table}`,
    `CREATE TABLE IF NOT EXISTS ${table} (
         id BIGSERIAL NOT NULL,
         event_id TEXT NOT NULL UNIQUE,
         aggregate_id TEXT NOT NULL,
         aggregate_version BIGINT NOT NULL,
         correlation_id TEXT NOT NULL,
         causation_id TEXT NOT NULL,
         recorded_on TIMESTAMPTZ NOT NULL,
         payload TEXT NOT NULL,
         event_name TEXT NOT NULL,
         PRIMARY KEY (id)
     );`,
  );

  await run(
    'Creating replication user',
    `CREATE USER ${replicationUserName} REPLICATION LOGIN PASSWORD '${replicationUserPass}';`,
  );

  await run(
    'Granting permissions to replication user',
    `GRANT CONNECT ON DATABASE "${database}" TO ${replicationUserName};`,
  );

  await run(
    'Granting select to replication user',
    `GRANT SELECT ON TABLE ${table} TO ${replicationUserName};`,
  );

  // Create publication
  await run(
    'Creating publication for table',
    `CREATE PUBLICATION ${replicationPublication} FOR TABLE ${table};`,
  );

  // Create indexes
  await run(
    'Creating aggregate id, aggregate version index',
    `CREATE UNIQUE INDEX event_store_idx_event_aggregate_id_version ON ${table}(aggregate_id, aggregate_version);`,
  );

  await run(
    'Creating id index',
    `CREATE UNIQUE INDEX event_store_idx_event_id ON ${table}(event_id);`,
  );

  await run(
    'Creating causation index',
    `CREATE INDEX event_store_idx_event_causation_id ON ${table}(causation_id);`,
  );

  await run(
    'Creating correlation index',
    `CREATE INDEX event_store_idx_event_correlation_id ON ${table}(correlation_id);`,
  );

  await run(
    'Creating recording index',
    `CREATE INDEX event_store_idx_occurred_on ON ${table}(recorded_on);`,
  );

  await run(
    'Creating event name index',
    `CREATE INDEX event_store_idx_event_name ON ${table}(event_name);`,
  );
}
