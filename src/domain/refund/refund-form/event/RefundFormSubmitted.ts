import { CreationEvent } from '../../../../common/event/CreationEvent';
import {RefundForm} from "../aggregate/RefundForm";

export class RefundFormSubmitted extends CreationEvent<RefundForm> {
    constructor(
        eventId: string,
        aggregateId: string,
        aggregateVersion: number,
        correlationId: string,
        causationId: string,
        recordedOn: Date,
        public readonly orderId: string,
        public readonly email: string,
        public readonly comment: string,
    ) {
        super(eventId, aggregateId, aggregateVersion, correlationId, causationId, recordedOn);
    }

    createAggregate(): RefundForm {
        return new RefundForm(
            this.aggregateId,
            this.aggregateVersion,
            this.orderId,
            this.email,
            this.comment
        );
    }
}