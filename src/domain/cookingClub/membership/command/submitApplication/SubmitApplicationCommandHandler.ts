import {
  CommandHandler,
  PostgresTransactionalEventStore,
  IdGenerator,
} from '@/common';
import { inject, injectable } from 'tsyringe';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership/event/ApplicationSubmitted';
import { SubmitApplicationCommand } from '@/domain/cookingClub/membership/command/submitApplication/SubmitApplicationCommand';

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
      command.numberOfCookingBooksRead,
    );

    await this.postgresTransactionalEventStore.saveEvent(applicationSubmitted);
  }
}
