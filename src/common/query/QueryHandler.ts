import { MongoTransactionalProjectionOperator } from '@/common/projection/MongoTransactionalProjectionOperator';
import { Query } from '@/common/query/Query';

export abstract class QueryHandler {
  constructor(
    protected readonly mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
  ) {}

  abstract handleQuery(query: Query): Promise<unknown>;
}
