import { MongoTransactionalProjectionOperator } from '@/common';
import { inject, injectable } from 'tsyringe';
import { MembershipApplication } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembershipApplication';

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
    return results[0] || null;
  }
}
