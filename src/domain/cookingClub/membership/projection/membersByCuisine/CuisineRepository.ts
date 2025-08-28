import { MongoTransactionalProjectionOperator } from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { Cuisine } from './Cuisine';

@injectable()
export class CuisineRepository {
  private readonly collectionName = 'CookingClub_MembersByCuisine_Cuisine';

  constructor(
    @inject(MongoTransactionalProjectionOperator)
    private readonly mongoOperator: MongoTransactionalProjectionOperator,
  ) {}

  async save(cuisine: Cuisine): Promise<void> {
    await this.mongoOperator.replaceOne(
      this.collectionName,
      { _id: cuisine._id },
      cuisine,
      { upsert: true },
    );
  }

  async findOneById(_id: string): Promise<Cuisine | null> {
    const results = await this.mongoOperator.find<Cuisine>(
      this.collectionName,
      { _id },
    );
    return results[0] || null;
  }

  async findAll(): Promise<Cuisine[]> {
    return this.mongoOperator.find<Cuisine>(this.collectionName, {});
  }
}
