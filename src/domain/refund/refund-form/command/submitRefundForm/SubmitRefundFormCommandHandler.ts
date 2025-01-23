import { CommandHandler } from '../../../../../common/command/CommandHandler';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { IdGenerator } from '../../../../../common/util/IdGenerator';
import {inject, injectable} from "tsyringe";
import { RefundFormSubmitted } from "../../event/RefundFormSubmitted";
import { SubmitRefundFormCommand } from "./SubmitRefundFormCommand";

@injectable()
export class SubmitApplicationCommandHandler extends CommandHandler {
    constructor(
        @inject(PostgresTransactionalEventStore) postgresTransactionalEventStore: PostgresTransactionalEventStore,
    ) {
        super(postgresTransactionalEventStore);
    }

    async handleCommand(command: SubmitRefundFormCommand): Promise<void> {
        const eventId = IdGenerator.generateRandomId();
        const aggregateId = IdGenerator.generateRandomId();

        const refundFormSubmitted = new RefundFormSubmitted(
            eventId,
            aggregateId,
            1,
            eventId,
            eventId,
            new Date(),
            command.orderId,
            command.email,
            command.comments,
        );

        await this.postgresTransactionalEventStore.saveEvent(refundFormSubmitted);
    }
}
