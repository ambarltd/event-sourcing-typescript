import { Request, Response } from 'express';
import {
  QueryController,
  MongoTransactionalProjectionOperator,
  Get,
} from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { MembersByCuisineQueryHandler } from './MembersByCuisineQueryHandler';
import { MembersByCuisineQuery } from './MembersByCuisineQuery';

@injectable()
export class MembersByCuisineQueryController extends QueryController {
  private readonly membersByCuisineQueryHandler: MembersByCuisineQueryHandler;

  constructor(
    @inject(MongoTransactionalProjectionOperator)
    mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
    @inject(MembersByCuisineQueryHandler)
    membersByCuisineQueryHandler: MembersByCuisineQueryHandler,
  ) {
    super(mongoTransactionalProjectionOperator);
    this.membersByCuisineQueryHandler = membersByCuisineQueryHandler;
  }

  @Get('/members-by-cuisine')
  async membersByCuisine(req: Request, res: Response): Promise<void> {
    const query = new MembersByCuisineQuery();

    const result = await this.processQuery(
      query,
      this.membersByCuisineQueryHandler,
    );
    res.status(200).json(result);
  }
}
