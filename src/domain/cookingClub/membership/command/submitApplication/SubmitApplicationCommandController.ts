import { Request, Response } from 'express';
import {
  CommandController,
  PostgresTransactionalEventStore,
  MongoTransactionalProjectionOperator,
  ValidationPipe,
  Route,
  Controller,
} from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { SubmitApplicationCommandHandler } from './SubmitApplicationCommandHandler';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';

@injectable()
@Controller('/api/v1/cooking-club/membership/command')
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
    const command = await ValidationPipe(SubmitApplicationCommand, req);

    await this.processCommand(command, this.submitApplicationCommandHandler);
    res.status(200).json({});
  }
}
