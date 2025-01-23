import { Router, Request, Response } from 'express';
import { CommandController } from '../../../../../common/command/CommandController';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import {inject, injectable} from "tsyringe";
import { SubmitRefundFormCommandHandler } from "./SubmitRefundFormCommandHandler";
import { SubmitRefundFormCommand } from "./SubmitRefundFormCommand";
import { z } from 'zod';

@injectable()
export class SubmitApplicationCommandController extends CommandController {
    public readonly router: Router;

    private readonly submitApplicationCommandHandler: SubmitRefundFormCommandHandler;

    constructor(
        @inject(PostgresTransactionalEventStore) postgresTransactionalEventStore: PostgresTransactionalEventStore,
        @inject(MongoTransactionalProjectionOperator) mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
        @inject(SubmitRefundFormCommandHandler) submitApplicationCommandHandler: SubmitRefundFormCommandHandler
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

        const requestBody = requestSchema.parse(req.body);
        const command = new SubmitRefundFormCommand(
            requestBody.orderId,
            requestBody.email,
            requestBody.comments,
        );

        await this.processCommand(command, this.submitApplicationCommandHandler);
        res.status(200).json({});
    }
}

const requestSchema = z.object({
    orderId: z.string().nonempty("Order ID is required"),
    email: z.string().email("Please enter a valid email address"),
    comments: z.string(),
});
