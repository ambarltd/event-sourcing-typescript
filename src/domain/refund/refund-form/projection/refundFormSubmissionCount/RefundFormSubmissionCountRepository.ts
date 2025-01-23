import {MongoTransactionalProjectionOperator} from "../../../../../common/projection/MongoTransactionalProjectionOperator";
import {inject, injectable} from "tsyringe";
import {Count} from "./Count";

@injectable()
export class RefundFormSubmissionCountRepository {
    private readonly collectionName = 'Refund_RefundForm_RefundFormSubmissionCount';

    constructor(
        @inject(MongoTransactionalProjectionOperator) private readonly mongoOperator: MongoTransactionalProjectionOperator
    ) {}

    async save(count: Count): Promise<void> {
        await this.mongoOperator.replaceOne(
            this.collectionName,
            { _id: count._id },
            count,
            { upsert: true }
        );
    }

    async findOneById(_id: string): Promise<Count | null> {
        const results = await this.mongoOperator.find<Count>(this.collectionName, { _id });
        return results.length > 0 ? results[0] : null;
    }
}