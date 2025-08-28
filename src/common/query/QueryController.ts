import { MongoTransactionalProjectionOperator } from '@/common/projection/MongoTransactionalProjectionOperator';
import { log } from '@/common/util/Logger';
import { QueryHandler } from '@/common/query/QueryHandler';
import { Query } from '@/common/query/Query';

export class QueryController {
  constructor(
    private readonly mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
  ) {}

  protected async processQuery(
    query: Query,
    queryHandler: QueryHandler,
  ): Promise<unknown> {
    try {
      log.debug(`Starting to process query: ${query.constructor.name}`);
      await this.mongoTransactionalProjectionOperator.startTransaction();
      const result = await queryHandler.handleQuery(query);
      await this.mongoTransactionalProjectionOperator.commitTransaction();
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();

      log.debug(`Successfully processed query: ${query.constructor.name}`);
      return result;
    } catch (error) {
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();
      log.error(`Exception in ProcessQuery: ${error}`, error as Error);
      throw new Error(`Failed to process query: ${error}`);
    }
  }
}
