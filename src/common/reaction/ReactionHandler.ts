import { Event } from '@/common/event/Event';
import { PostgresTransactionalEventStore } from '@/common/eventStore/PostgresTransactionalEventStore';

export abstract class ReactionHandler {
  constructor(
    protected readonly postgresTransactionalEventStore: PostgresTransactionalEventStore,
  ) {}

  abstract react(event: Event): Promise<void>;
}
