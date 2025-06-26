
import { DomainEvent } from './domain-event.base';
import { Entity } from './entity.base';

export type Func = (...args: unknown[]) => unknown;

export abstract class AggregateRoot<EntityProps, EntityRawProps> extends Entity<
  EntityProps,
  EntityRawProps
> {
  protected abstract readonly eventAppliers: Map<
    string,
    (event: DomainEvent) => void
  >;

  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }

  publishEvents(eventBus: unknown): void {
    // for (const event of this._domainEvents) {
    //   eventBus.publish(event);
    // }

    this.clearEvents();
  }

  static rehydrate<EntityProps, EntityRawProps>(
    this: new (values: { id: string; props: EntityProps }) => AggregateRoot<
      EntityProps,
      EntityRawProps
    >,
    events: DomainEvent[]
  ): AggregateRoot<EntityProps, EntityRawProps> {
    if (events.length === 0) {
      throw new Error('No events to rehydrate');
    }

    const [firstEvent, ...restEvents] = events;

    const { aggregateId, id, metadata, ...props } = firstEvent;
    const entityProps = props as EntityProps;
    const aggregate = new this({ id: aggregateId, props: entityProps });

    restEvents.forEach((event) => {
      if (!event.metadata?.excludedInReplay) {
        if (event.constructor.name !== 'UnknownEvent') {
          aggregate.applyEvent(event);
        }
      }
    });

    aggregate.clearEvents();

    return aggregate;
  }

  protected applyEvent(event: DomainEvent): void {
    const handler = this.eventAppliers.get(event.constructor.name);

    if (handler) {
      handler(event);
    } else {
      throw new Error(`Unhandled event type: ${event.constructor.name}`);
    }
  }

  protected processEvent(
    event: DomainEvent,
    processor: Func,
    _aggregateId?: string
  ): void {
    const { id, aggregateId, metadata, ...rest } = event;
    processor({ ...rest, id: _aggregateId ?? aggregateId });
  }
}
