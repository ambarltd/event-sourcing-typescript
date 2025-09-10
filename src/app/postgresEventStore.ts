export { PostgresEventStore };

import { Serializer } from '@/common/serializedEvent/Serializer';
import { Deserializer } from '@/common/serializedEvent/Deserializer';
import { SerializedEvent } from '@/common/serializedEvent/SerializedEvent';
import { Event } from '@/common/event/Event';
import { CreationEvent } from '@/common/event/CreationEvent';
import { TransformationEvent } from '@/common/event/TransformationEvent';
import { Aggregate } from '@/common/aggregate/Aggregate';
import { AggregateAndEventIdsInLastEvent } from '@/common/eventStore/AggregateAndEventIdsInLastEvent';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { PostgresTransaction } from '@/lib/postgres';

class PostgresEventStore implements EventStore {
  constructor(
    private transaction: PostgresTransaction,
    private readonly serializer: Serializer,
    private readonly deserializer: Deserializer,
    private readonly eventStoreTable: string,
  ) {}

  async findAggregate<T extends Aggregate>(
    aggregateId: string,
  ): Promise<AggregateAndEventIdsInLastEvent<T>> {
    const serializedEvents =
      await this.findAllSerializedEventsByAggregateId(aggregateId);
    const events = serializedEvents.map((e) =>
      this.deserializer.deserialize(e),
    );

    const firstEvent: Event | undefined = events[0];
    if (firstEvent == undefined) {
      throw new Error(`No events found for aggregateId: ${aggregateId}`);
    }
    const creationEvent: Event = firstEvent;
    if (!this.isCreationEventForAggregate<T>(creationEvent)) {
      throw new Error('First event is not a creation event');
    }
    const transformationEvents = events.slice(1);

    let aggregate = creationEvent.createAggregate();
    let eventIdOfLastEvent = creationEvent.eventId;
    let correlationIdOfLastEvent = creationEvent.correlationId;

    for (const transformationEvent of transformationEvents) {
      if (!this.isTransformationEventForAggregate<T>(transformationEvent)) {
        throw new Error('Event is not a transformation event');
      }
      aggregate = transformationEvent.transformAggregate(aggregate);
      eventIdOfLastEvent = transformationEvent.eventId;
      correlationIdOfLastEvent = transformationEvent.correlationId;
    }

    return {
      aggregate,
      eventIdOfLastEvent,
      correlationIdOfLastEvent,
    };
  }

  async saveEvent(event: Event): Promise<void> {
    await this.saveSerializedEvent(this.serializer.serialize(event));
  }

  async doesEventAlreadyExist(eventId: string): Promise<boolean> {
    const event = await this.findSerializedEventByEventId(eventId);
    return event !== null;
  }

  private async findAllSerializedEventsByAggregateId(
    aggregateId: string,
  ): Promise<SerializedEvent[]> {
    const sql = `
            SELECT id, event_id, aggregate_id, causation_id, correlation_id,
                   aggregate_version, json_payload, json_metadata, recorded_on, event_name
            FROM ${this.eventStoreTable}
            WHERE aggregate_id = $1
            ORDER BY aggregate_version ASC
        `;

    try {
      const result = await this.transaction.query(sql, [aggregateId]);
      return result.rows.map(this.mapRowToSerializedEvent);
    } catch (error) {
      throw new Error(
        `Failed to fetch events for aggregate: ${aggregateId}: ${error}`,
      );
    }
  }

  private async saveSerializedEvent(
    serializedEvent: SerializedEvent,
  ): Promise<void> {
    const sql = `
            INSERT INTO ${this.eventStoreTable} (
                event_id, aggregate_id, causation_id, correlation_id,
                aggregate_version, json_payload, json_metadata, recorded_on, event_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

    const values = [
      serializedEvent.event_id,
      serializedEvent.aggregate_id,
      serializedEvent.causation_id,
      serializedEvent.correlation_id,
      serializedEvent.aggregate_version.toString(),
      serializedEvent.json_payload,
      serializedEvent.json_metadata,
      serializedEvent.recorded_on,
      serializedEvent.event_name,
    ];

    try {
      await this.transaction.query(sql, values);
    } catch (error) {
      throw new Error(
        `Failed to save event: ${serializedEvent.event_id}: ${error}`,
      );
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
