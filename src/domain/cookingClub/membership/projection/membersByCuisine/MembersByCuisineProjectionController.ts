import { Request, Response } from 'express';
import {
  MongoTransactionalProjectionOperator,
  Deserializer,
  AmbarHttpRequest,
  ProjectionController,
  Post,
  Controller,
} from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { MembersByCuisineProjectionHandler } from './MembersByCuisineProjectionHandler';

@injectable()
@Controller('/api/v1/cooking-club/membership/projection')
export class MembersByCuisineProjectionController extends ProjectionController {
  constructor(
    @inject(MongoTransactionalProjectionOperator)
    mongoOperator: MongoTransactionalProjectionOperator,
    @inject(Deserializer) deserializer: Deserializer,
    @inject(MembersByCuisineProjectionHandler)
    private readonly membersByCuisineProjectionHandler: MembersByCuisineProjectionHandler,
  ) {
    super(mongoOperator, deserializer);
  }

  @Post('/members-by-cuisine')
  async projectIsCardProductActive(req: Request, res: Response): Promise<void> {
    const response = await this.processProjectionHttpRequest(
      req.body as AmbarHttpRequest,
      this.membersByCuisineProjectionHandler,
      'CookingClub_MembersByCuisine',
    );
    res.status(200).contentType('application/json').send(response);
  }
}
