import { Request, Response, Router } from 'express';
import { QueryController } from '../../../../../common/query/QueryController';
import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { inject, injectable } from 'tsyringe';
import { MembersByCuisineQueryHandler } from './MembersByCuisineQueryHandler';
import { MembersByCuisineQuery } from './MembersByCuisineQuery';

@injectable()
export class MembersByCuisineQueryController extends QueryController {
  public readonly router: Router;

  private readonly membersByCuisineQueryHandler: MembersByCuisineQueryHandler;

  constructor(
    @inject(MongoTransactionalProjectionOperator)
    mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
    @inject(MembersByCuisineQueryHandler)
    membersByCuisineQueryHandler: MembersByCuisineQueryHandler,
  ) {
    super(mongoTransactionalProjectionOperator);
    this.membersByCuisineQueryHandler = membersByCuisineQueryHandler;
    this.router = Router();
    this.router.post('/members-by-cuisine', this.membersByCuisine.bind(this));
  }

  async membersByCuisine(req: Request, res: Response): Promise<void> {
    const query = new MembersByCuisineQuery();

    const result = await this.processQuery(
      query,
      this.membersByCuisineQueryHandler,
    );
    res.status(200).json(result);
  }
}
