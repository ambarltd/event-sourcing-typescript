import { Router, Request, Response } from 'express';
import { CommandController } from '../../../../../common/command/CommandController';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import {inject, injectable} from "tsyringe";
import { SubmitApplicationCommandHandler } from "./SubmitApplicationCommandHandler";
import { SubmitApplicationHttpRequest } from "./SubmitApplicationHttpRequest";
import { SubmitApplicationCommand } from "./SubmitApplicationCommand";

@injectable()
export class SubmitApplicationCommandController extends CommandController {
    public readonly router: Router;

    private readonly submitApplicationCommandHandler: SubmitApplicationCommandHandler;

    constructor(
        @inject(PostgresTransactionalEventStore) postgresTransactionalEventStore: PostgresTransactionalEventStore,
        @inject(MongoTransactionalProjectionOperator) mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
        @inject(SubmitApplicationCommandHandler) submitApplicationCommandHandler: SubmitApplicationCommandHandler
    ) {
        super(postgresTransactionalEventStore, mongoTransactionalProjectionOperator);
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

        const requestBody: SubmitApplicationHttpRequest = req.body;
        const command = new SubmitApplicationCommand(
            requestBody.firstName,
            requestBody.lastName,
            requestBody.favoriteCuisine,
            requestBody.yearsOfProfessionalExperience,
            requestBody.numberOfCookingBooksRead
        );

        await this.processCommand(command, this.submitApplicationCommandHandler);
        res.status(200).json({});
    }
}
