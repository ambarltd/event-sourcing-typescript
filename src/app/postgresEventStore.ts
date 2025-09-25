export { initialize, PostgresEventStore };

import { Json } from '@/lib/json/types';
import { SerializedEvent } from '@/common/serializedEvent/SerializedEvent';
import {
  Id,
  Event,
  EventClass,
  Aggregate,
  CreationEvent,
  TransformationEvent,
  EventInfo,
} from '@/lib/eventSourcing/event';
import {
  EventStore,
  Hydrator,
  Constructor,
  EventData,
} from '@/lib/eventSourcing/eventStore';
import { PostgresTransaction } from '@/lib/postgres';
import { log } from '@/common/util/Logger';
import { IdGenerator } from '@/common/util/IdGenerator';
import { encode } from '@/lib/json/schema';
import { POSIX } from '@/lib/time';
import { DateTime } from 'luxon';

class PostgresEventStore implements EventStore {
  constructor(
    private transaction: PostgresTransaction,
    private readonly hydrator: Hydrator,
    private readonly eventStoreTable: string,
  ) {}

  async find<T extends Aggregate<T>>(
    cls: Constructor<T>,
    aggregateId: Id<T>,
  ): Promise<{ aggregate: T; lastEvent: EventInfo }> {
    const events = await this.findAll(aggregateId);
    const { lastEvent, aggregate } = this.hydrator
      .hydrate(cls, events)
      .unwrap((e) => e);

    return { aggregate, lastEvent };
  }

  async save<E extends EventClass<E, T>, T extends Aggregate<T>>(args: {
    aggregate: Constructor<T>;
    event: CreationEvent<E, T> | TransformationEvent<E, T>;
    event_id?: Id<Event<T>>;
    correlation_id?: Id<Event<T>>;
    causation_id?: Id<Event<T>>;
  }): Promise<void> {
    const event = args.event;
    const event_id = args.event_id || new Id(IdGenerator.generateRandomId());
    let info: EventInfo;
    switch (true) {
      case event instanceof CreationEvent: {
        const aggregate: T = event.createAggregate();
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
        const { aggregate, lastEvent } = await this.find(
          args.aggregate,
          event.values.aggregateId,
        );
        info = {
          event_id,
          aggregate_id: aggregate.aggregateId,
          aggregate_version: aggregate.aggregateVersion + 1,
          correlation_id: lastEvent.correlation_id,
          causation_id: lastEvent.causation_id,
          recorded_on: POSIX.now(),
        };
        break;
      }
      default:
        return event satisfies never;
    }

    await this.insert({ info, event });
  }

  async doesEventAlreadyExist(eventId: string): Promise<boolean> {
    const event = await this.findSerializedEventByEventId(eventId);
    return event !== null;
  }

  private async findAll<T extends Aggregate<T>>(
    aggregateId: Id<T>,
  ): Promise<Json[]> {
    const sql = `
            SELECT id, event_id, aggregate_id, causation_id, correlation_id,
                   aggregate_version, json_payload, json_metadata, recorded_on, event_name
            FROM ${this.eventStoreTable}
            WHERE aggregate_id = $1
            ORDER BY aggregate_version ASC
        `;

    try {
      const result = await this.transaction.query(sql, [aggregateId.value]);
      return result.rows;
    } catch (error) {
      throw new Error(
        `Failed to fetch events for aggregate: ${aggregateId}: ${error}`,
      );
    }
  }

  private async insert<E extends Event<any>>({ info, event }: EventData<E>) {
    const sql = `
      INSERT INTO ${this.eventStoreTable} (
          event_id, aggregate_id, causation_id, correlation_id,
          aggregate_version, json_payload, json_metadata, recorded_on, event_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const payload = encode(event.schema, event);
    const values = [
      info.event_id.value,
      info.aggregate_id.value,
      info.causation_id.value,
      info.correlation_id.value,
      info.aggregate_version.toString(),
      JSON.stringify(payload),
      '{}',
      encodePOSIX(info.recorded_on),
      event.type,
    ];

    try {
      await this.transaction.query(sql, values);
    } catch (error) {
      throw new Error(`Failed to save event: ${info.event_id}: ${error}`);
    }
  }

  private async findSerializedEventByEventId(
    eventId: string,
  ): Promise<SerializedEvent | null> {
    const sql = `
            SELECT id, event_id, aggregate_id, causation_id, correlation_id,
                   aggregate_version, json_payload, json_metadata, recorded_on, event_name
            FROM ${this.eventStoreTable}
            WHERE event_id = $1
        `;

    try {
      const result = await this.transaction.query(sql, [eventId]);
      return result.rows.length > 0
        ? this.mapRowToSerializedEvent(result.rows[0])
        : null;
    } catch (error) {
      throw new Error(`Failed to fetch event: ${eventId}: ${error}`);
    }
  }

  private mapRowToSerializedEvent(row: any): SerializedEvent {
    return {
      id: row.id,
      event_id: row.event_id,
      aggregate_id: row.aggregate_id,
      causation_id: row.causation_id,
      correlation_id: row.correlation_id,
      aggregate_version: row.aggregate_version,
      json_payload: row.json_payload,
      json_metadata: row.json_metadata,
      recorded_on: row.recorded_on,
      event_name: row.event_name,
    };
  }

  private isCreationEventForAggregate<T extends Aggregate>(
    event: Event,
  ): event is CreationEvent<T> {
    return event instanceof CreationEvent;
  }

  private isTransformationEventForAggregate<T extends Aggregate>(
    event: Event,
  ): event is TransformationEvent<T> {
    return event instanceof TransformationEvent;
  }
}

function encodePOSIX(value: POSIX): string {
  const { date, time } = value.toUTCDateAndTime();
  return `${date.pretty()}T${time.pretty()}Z`;
}

function decodePOSIX(str: string): POSIX {
  const date = DateTime.fromISO(str, { zone: 'UTC' });
  if (!date.isValid) {
    throw new Error(`Invalid ISO date: ${str}`);
  }

  return new POSIX(date.toMillis());
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
         causation_id TEXT NOT NULL,
         correlation_id TEXT NOT NULL,
         recorded_on TIMESTAMPTZ NOT NULL,
         event_name TEXT NOT NULL,
         json_payload TEXT NOT NULL,
         json_metadata TEXT NOT NULL,
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
