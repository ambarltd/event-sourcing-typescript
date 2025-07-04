import { Router, Request, Response } from 'express';
import {
  CommandController,
  PostgresTransactionalEventStore,
  MongoTransactionalProjectionOperator,
  ValidationPipe,
} from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { SubmitApplicationCommandHandler } from './SubmitApplicationCommandHandler';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';

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


    this.router.post(
      '/submit-application',
      ValidationPipe(SubmitApplicationCommand),
      this.submitApplication.bind(this),
    );
  }

  async submitApplication(req: Request, res: Response): Promise<void> {
    const sessionToken = req.header('X-With-Session-Token');
    if (!sessionToken) {
      res.status(400).send({ error: 'Session token is required' });
      return;
    }

    console.log(
      'req.validatedBody',
      req.validatedBody,
      req.validatedBody.name,
      req.body,
      req.body.name,
    );

    const requestDto = req.validatedBody as SubmitApplicationCommand;

    const command = new SubmitApplicationCommand(
      requestDto.firstName,
      requestDto.lastName,
      requestDto.favoriteCuisine,
      requestDto.yearsOfProfessionalExperience,
      requestDto.numberOfCookingBooksRead,
    );

    await this.processCommand(command, this.submitApplicationCommandHandler);
    res.status(200).json({});
  }
}
