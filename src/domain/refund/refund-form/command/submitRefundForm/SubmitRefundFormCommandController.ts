import { Router, Request, Response } from 'express';
import { CommandController } from '../../../../../common/command/CommandController';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import {inject, injectable} from "tsyringe";
import { SubmitRefundFormCommandHandler } from "./SubmitRefundFormCommandHandler";
import { SubmitRefundFormCommand } from "./SubmitRefundFormCommand";
import { z } from 'zod';

@injectable()
export class SubmitRefundFormCommandController extends CommandController {
    public readonly router: Router;

    private readonly submitRefundFormCommandHandler: SubmitRefundFormCommandHandler;

    constructor(
        @inject(PostgresTransactionalEventStore) postgresTransactionalEventStore: PostgresTransactionalEventStore,
        @inject(MongoTransactionalProjectionOperator) mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
        @inject(SubmitRefundFormCommandHandler) submitRefundFormCommandHandler: SubmitRefundFormCommandHandler
    ) {
        super(postgresTransactionalEventStore, mongoTransactionalProjectionOperator);
        this.submitRefundFormCommandHandler = submitRefundFormCommandHandler;
        this.router = Router();
        this.router.post('/submit-refund-form', this.submitRefundForm.bind(this));
    }

    async submitRefundForm(req: Request, res: Response): Promise<void> {
        const requestBody = requestSchema.parse(req.body);
        const command = new SubmitRefundFormCommand(
            requestBody.orderId,
            requestBody.email,
            requestBody.comments,
        );

        await this.processCommand(command, this.submitRefundFormCommandHandler);
        res.status(200).json({});
    }
}

const requestSchema = z.object({
    orderId: z.string().nonempty("Order ID is required"),
    email: z.string().email("Please enter a valid email address"),
    comments: z.string(),
});
