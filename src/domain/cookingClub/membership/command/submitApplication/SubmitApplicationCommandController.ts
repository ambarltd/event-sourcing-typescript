import { Router, Request, Response } from 'express';
import {
  CommandController,
  PostgresTransactionalEventStore,
  MongoTransactionalProjectionOperator,
  ValidationPipe,
} from '../../../../../common';
import { Route } from '../../../../../common/route/Route';
import { inject, injectable } from 'tsyringe';
import { SubmitApplicationCommandHandler } from './SubmitApplicationCommandHandler';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';

@injectable()
export class SubmitApplicationCommandController extends CommandController {
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
  }

  @Route('/submit-application')
  async submitApplication(req: Request, res: Response): Promise<void> {
    const requestDto = await ValidationPipe(SubmitApplicationCommand, req, res);

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
