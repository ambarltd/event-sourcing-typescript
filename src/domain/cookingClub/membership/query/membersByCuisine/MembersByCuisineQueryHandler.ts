import {
  QueryHandler,
  MongoTransactionalProjectionOperator,
} from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { CuisineRepository } from '../../projection/membersByCuisine/CuisineRepository';
import { MembersByCuisineQuery } from './MembersByCuisineQuery';
import { Cuisine } from '../../projection/membersByCuisine/Cuisine';

@injectable()
export class MembersByCuisineQueryHandler extends QueryHandler {
  private readonly cuisineRepository: CuisineRepository;

  constructor(
    @inject(MongoTransactionalProjectionOperator)
    mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
    @inject(CuisineRepository) cuisineRepository: CuisineRepository,
  ) {
    super(mongoTransactionalProjectionOperator);
    this.cuisineRepository = cuisineRepository;
  }

  async handleQuery(_query: MembersByCuisineQuery): Promise<Cuisine[]> {
    return await this.cuisineRepository.findAll();
  }
}
