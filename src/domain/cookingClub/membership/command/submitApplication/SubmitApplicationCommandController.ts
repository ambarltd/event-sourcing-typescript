import { Router, Request, Response } from 'express';
import { CommandController } from '../../../../../common/command/CommandController';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { ValidationPipe } from '../../../../../common/middleware';
import { inject, injectable } from 'tsyringe';
import { SubmitApplicationCommandHandler } from './SubmitApplicationCommandHandler';
import { SubmitApplicationCommand } from './SubmitApplicationCommand';
import { SubmitApplicationRequest } from './SubmitApplicationRequest';

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
      ValidationPipe(SubmitApplicationRequest),
      this.submitApplication.bind(this),
    );
  }

  async submitApplication(req: Request, res: Response): Promise<void> {
    // TODO: uncomment when done working / testing
    // const sessionToken = req.header('X-With-Session-Token');
    // if (!sessionToken) {
    //     res.status(400).send({ error: 'Session token is required' });
    //     return;
    // }

    const requestDto = req.validatedBody as SubmitApplicationRequest;

    const command = new SubmitApplicationCommand({ ...requestDto });

    await this.processCommand(command, this.submitApplicationCommandHandler);
    res.status(200).json({});
  }
}
