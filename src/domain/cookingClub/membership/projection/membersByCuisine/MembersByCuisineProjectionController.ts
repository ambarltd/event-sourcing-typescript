import { Request, Response, Router } from 'express';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { Deserializer } from '../../../../../common/serializedEvent/Deserializer';
import { AmbarHttpRequest } from '../../../../../common/ambar/AmbarHttpRequest';
import {ProjectionController} from "../../../../../common/projection/ProjectionController";
import {inject, injectable} from "tsyringe";
import {MembersByCuisineProjectionHandler} from "./MembersByCuisineProjectionHandler";

@injectable()
export class MembersByCuisineProjectionController extends ProjectionController {
    public readonly router: Router;

    constructor(
        @inject(MongoTransactionalProjectionOperator) mongoOperator: MongoTransactionalProjectionOperator,
        @inject(Deserializer) deserializer: Deserializer,
        @inject(MembersByCuisineProjectionHandler) private readonly membersByCuisineProjectionHandler: MembersByCuisineProjectionHandler,
    ) {
        super(mongoOperator, deserializer);
        this.router = Router();
        this.router.post('/members-by-cuisine', this.projectIsCardProductActive.bind(this));
    }

    private async projectIsCardProductActive(req: Request, res: Response): Promise<void> {
        const response = await this.processProjectionHttpRequest(
            req.body as AmbarHttpRequest,
            this.membersByCuisineProjectionHandler,
            'CookingClub_MembersByCuisine'
        );
        res.status(200).contentType('application/json').send(response);
    }
}
