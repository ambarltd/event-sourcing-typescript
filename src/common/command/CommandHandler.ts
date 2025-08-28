import { Command } from '@/common/command/Command';
import { PostgresTransactionalEventStore } from '@/common/eventStore/PostgresTransactionalEventStore';

export abstract class CommandHandler {
  constructor(
    protected readonly postgresTransactionalEventStore: PostgresTransactionalEventStore,
  ) {}

  abstract handleCommand(command: Command): Promise<void>;
}
