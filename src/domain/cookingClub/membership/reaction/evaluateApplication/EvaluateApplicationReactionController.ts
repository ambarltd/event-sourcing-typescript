import { ReactionController } from '../../../../../common/reaction/ReactionController';
import { AmbarHttpRequest } from '../../../../../common/ambar/AmbarHttpRequest';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { Deserializer } from '../../../../../common/serializedEvent/Deserializer';
import {Request, Response, Router} from "express";
import {inject, injectable} from "tsyringe";
import {EvaluateApplicationReactionHandler} from "./EvaluateApplicationReactionHandler";

@injectable()
export class EvaluateApplicationReactionController extends ReactionController {
    public readonly router: Router;

    constructor(
        @inject(PostgresTransactionalEventStore) eventStore: PostgresTransactionalEventStore,
        @inject(MongoTransactionalProjectionOperator) mongoOperator: MongoTransactionalProjectionOperator,
        @inject(Deserializer) deserializer: Deserializer,
        @inject(EvaluateApplicationReactionHandler) private readonly evaluateApplicationReactionHandler: EvaluateApplicationReactionHandler
    ) {
        super(eventStore, mongoOperator, deserializer);
        this.router = Router();
        this.router.post('/evaluate-application', this.reactWithEvaluateApplication.bind(this));
    }

    async reactWithEvaluateApplication(req: Request, res: Response): Promise<void> {
        const response = await this.processReactionHttpRequest(
            req.body as AmbarHttpRequest,
            this.evaluateApplicationReactionHandler,
        );
        res.status(200).contentType('application/json').send(response);
    }
}
