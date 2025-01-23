import { Aggregate } from '../../../../common/aggregate/Aggregate';

export class RefundForm extends Aggregate {
    constructor(
        aggregateId: string,
        aggregateVersion: number,
        public readonly orderId: string,
        public readonly email: string,
        public readonly comment: string,
    ) {
        super(aggregateId, aggregateVersion);
    }
}