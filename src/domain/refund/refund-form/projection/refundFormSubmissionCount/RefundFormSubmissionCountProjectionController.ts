import { Request, Response, Router } from 'express';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { Deserializer } from '../../../../../common/serializedEvent/Deserializer';
import { AmbarHttpRequest } from '../../../../../common/ambar/AmbarHttpRequest';
import {ProjectionController} from "../../../../../common/projection/ProjectionController";
import {inject, injectable} from "tsyringe";
import {RefundFormSubmissionCountProjectionHandler} from "./RefundFormSubmissionCountProjectionHandler";

@injectable()
export class RefundFormSubmissionCountProjectionController extends ProjectionController {
    public readonly router: Router;

    constructor(
        @inject(MongoTransactionalProjectionOperator) mongoOperator: MongoTransactionalProjectionOperator,
        @inject(Deserializer) deserializer: Deserializer,
        @inject(RefundFormSubmissionCountProjectionHandler) private readonly refundFormSubmissionCountProjectionHandler: RefundFormSubmissionCountProjectionHandler,
    ) {
        super(mongoOperator, deserializer);
        this.router = Router();
        this.router.post('/refund-form-submission-count', this.projectIsCardProductActive.bind(this));
    }

    private async projectIsCardProductActive(req: Request, res: Response): Promise<void> {
        const response = await this.processProjectionHttpRequest(
            req.body as AmbarHttpRequest,
            this.refundFormSubmissionCountProjectionHandler,
            'Refund_RefundForm_RefundFormSubmissionCount'
        );
        res.status(200).contentType('application/json').send(response);
    }
}
