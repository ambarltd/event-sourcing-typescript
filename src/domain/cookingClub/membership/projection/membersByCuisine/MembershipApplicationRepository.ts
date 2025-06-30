import { MongoTransactionalProjectionOperator } from '../../../../../common/projection/MongoTransactionalProjectionOperator';
import { inject, injectable } from 'tsyringe';
import { MembershipApplication } from './MembershipApplication';

@injectable()
export class MembershipApplicationRepository {
  private readonly collectionName =
    'CookingClub_MembersByCuisine_MembershipApplication';

  constructor(
    @inject(MongoTransactionalProjectionOperator)
    private readonly mongoOperator: MongoTransactionalProjectionOperator,
  ) {}

  async save(membershipApplication: MembershipApplication): Promise<void> {
    await this.mongoOperator.replaceOne(
      this.collectionName,
      { _id: membershipApplication._id },
      membershipApplication,
      { upsert: true },
    );
  }

  async findOneById(_id: string): Promise<MembershipApplication | null> {
    const results = await this.mongoOperator.find<MembershipApplication>(
      this.collectionName,
      { _id },
    );
    return results.length > 0 ? results[0] : null;
  }
}
