import { Router, Request, Response } from 'express';
import { CommandController } from '../../../../../common/command/CommandController';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { inject, injectable } from 'tsyringe';
import { SubmitApplicationCommandHandler } from './SubmitApplicationCommandHandler';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';
import { z } from 'zod';

@injectable()
export class SubmitApplicationCommandController extends CommandController {
  public readonly router: Router;

  private readonly submitApplicationCommandHandler: SubmitApplicationCommandHandler;

  constructor(
    @inject(PostgresTransactionalEventStore)
    postgresTransactionalEventStore: PostgresTransactionalEventStore,
    @inject(MongoTransactionalProjectionOperator)
    mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
    @inject(SubmitApplicationCommandHandler)
    submitApplicationCommandHandler: SubmitApplicationCommandHandler,
  ) {
    super(
      postgresTransactionalEventStore,
      mongoTransactionalProjectionOperator,
    );
    this.submitApplicationCommandHandler = submitApplicationCommandHandler;
    this.router = Router();
    this.router.post('/submit-application', this.submitApplication.bind(this));
  }

  async submitApplication(req: Request, res: Response): Promise<void> {
    const sessionToken = req.header('X-With-Session-Token');
    if (!sessionToken) {
      res.status(400).send({ error: 'Session token is required' });
      return;
    }

    const requestBody = requestSchema.parse(req.body);
    const command = new SubmitApplicationCommand(
      requestBody.firstName,
      requestBody.lastName,
      requestBody.favoriteCuisine,
      requestBody.yearsOfProfessionalExperience,
      requestBody.numberOfCookingBooksRead,
    );

    await this.processCommand(command, this.submitApplicationCommandHandler);
    res.status(200).json({});
  }
}

const requestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  favoriteCuisine: z.string().min(1, 'Favorite cuisine is required').max(100),
  yearsOfProfessionalExperience: z
    .number()
    .min(0, 'Years of experience cannot be negative')
    .max(100, 'Please enter a valid number of years'),
  numberOfCookingBooksRead: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Number of books cannot be negative'),
});
