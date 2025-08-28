import { AmbarHttpRequest } from '@/common/ambar/AmbarHttpRequest';
import { AmbarResponseFactory } from '@/common/ambar/AmbarResponseFactory';
import { PostgresTransactionalEventStore } from '@/common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '@/common/projection/MongoTransactionalProjectionOperator';
import { Deserializer } from '@/common/serializedEvent/Deserializer';
import { log } from '@/common/util/Logger';
import { ReactionHandler } from '@/common/reaction/ReactionHandler';

export abstract class ReactionController {
  constructor(
    private readonly postgresTransactionalEventStore: PostgresTransactionalEventStore,
    private readonly mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
    private readonly deserializer: Deserializer,
  ) {}

  protected async processReactionHttpRequest(
    ambarHttpRequest: AmbarHttpRequest,
    reactionHandler: ReactionHandler,
  ): Promise<string> {
    try {
      log.debug(
        `Starting to process reaction for event name: ${ambarHttpRequest.payload.event_name} using handler: ${reactionHandler.constructor.name}`,
      );
      await this.postgresTransactionalEventStore.beginTransaction();
      await this.mongoTransactionalProjectionOperator.startTransaction();
      await reactionHandler.react(
        this.deserializer.deserialize(ambarHttpRequest.payload),
      );
      await this.postgresTransactionalEventStore.commitTransaction();
      await this.mongoTransactionalProjectionOperator.commitTransaction();

      await this.postgresTransactionalEventStore.abortDanglingTransactionsAndReturnConnectionToPool();
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();

      log.debug(
        `Reaction successfully processed for event name: ${ambarHttpRequest.payload.event_name} using handler: ${reactionHandler.constructor.name}`,
      );
      return AmbarResponseFactory.successResponse();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Unknown event type')
      ) {
        await this.postgresTransactionalEventStore.abortDanglingTransactionsAndReturnConnectionToPool();
        await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();
        log.debug(
          `Unknown event in reaction ignored for event name: ${ambarHttpRequest.payload.event_name} using handler: ${reactionHandler.constructor.name}`,
        );
        return AmbarResponseFactory.successResponse();
      }

      await this.postgresTransactionalEventStore.abortDanglingTransactionsAndReturnConnectionToPool();
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();
      log.error('Exception in ProcessReactionHttpRequest:', error as Error);
      return AmbarResponseFactory.retryResponse(error as Error);
    }
  }
}
