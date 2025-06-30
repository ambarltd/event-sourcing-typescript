import { CommandHandler } from '../../../../../common/command/CommandHandler';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { IdGenerator } from '../../../../../common/util/IdGenerator';
import { inject, injectable } from 'tsyringe';
import {
  ApplicationSubmitted,
  ApplicationSubmittedProps,
} from '../../event/ApplicationSubmitted';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';

@injectable()
export class SubmitApplicationCommandHandler extends CommandHandler {
  constructor(
    @inject(PostgresTransactionalEventStore)
    postgresTransactionalEventStore: PostgresTransactionalEventStore,
  ) {
    super(postgresTransactionalEventStore);
  }

  async handleCommand(command: SubmitApplicationCommand): Promise<void> {
    const eventId = IdGenerator.generateRandomId();
    const aggregateId = IdGenerator.generateRandomId();

    const applicationSubmittedProps: ApplicationSubmittedProps = {
      eventId,
      aggregateId,
      aggregateVersion: 1,
      correlationId: eventId,
      causationId: eventId,
      recordedOn: new Date(),
      firstName: command.firstName,
      lastName: command.lastName,
      favoriteCuisine: command.favoriteCuisine,
      yearsOfProfessionalExperience: command.yearsOfProfessionalExperience,
      numberOfCookingBooksRead: command.numberOfCookingBooksRead,
    };

    const applicationSubmitted = new ApplicationSubmitted(
      applicationSubmittedProps,
    );

    await this.postgresTransactionalEventStore.saveEvent(applicationSubmitted);
  }
}
