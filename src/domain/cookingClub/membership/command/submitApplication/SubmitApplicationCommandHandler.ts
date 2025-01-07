import { CommandHandler } from '../../../../../common/command/CommandHandler';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { IdGenerator } from '../../../../../common/util/IdGenerator';
import {inject, injectable} from "tsyringe";
import { ApplicationSubmitted } from "../../event/ApplicationSubmitted";
import { SubmitApplicationCommand } from "./SubmitApplicationCommand";

@injectable()
export class SubmitApplicationCommandHandler extends CommandHandler {
    constructor(
        @inject(PostgresTransactionalEventStore) postgresTransactionalEventStore: PostgresTransactionalEventStore,
    ) {
        super(postgresTransactionalEventStore);
    }

    async handleCommand(command: SubmitApplicationCommand): Promise<void> {
        const eventId = IdGenerator.generateRandomId();
        const aggregateId = IdGenerator.generateRandomId();

        const applicationSubmitted = new ApplicationSubmitted(
            eventId,
            aggregateId,
            1,
            eventId,
            eventId,
            new Date(),
            command.firstName,
            command.lastName,
            command.favoriteCuisine,
            command.yearsOfProfessionalExperience,
            command.numberOfCookingBooksRead
        );

        await this.postgresTransactionalEventStore.saveEvent(applicationSubmitted);
    }
}
