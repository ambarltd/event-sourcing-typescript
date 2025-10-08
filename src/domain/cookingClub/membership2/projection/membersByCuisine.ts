export { controller, RepoCuisine, type Cuisine };

import * as d from '@/lib/json/decoder';
import * as s from '@/lib/json/schema';
import { accept } from '@/lib/eventSourcing/projection';
import { ReactionHandler, ReactionController } from '@/app/reactionHandler';
import { Future } from '@/lib/Future';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership2/events/membership/applicationEvaluated';
import { Membership } from '@/domain/cookingClub/membership2/aggregate/membership';
import { AmbarResponse, ErrorMustRetry } from '@/app/ambar';
import * as m from '@/lib/Maybe';
import {
  Repository,
  Collection,
  MongoProjectionStore,
} from '@/app/mongoProjectionStore';

type Cuisine = s.Infer<typeof schema_Cuisine>;

const schema_Cuisine = s.object({
  memberNames: s.array(s.string),
});

class RepoCuisine {
  static collectionName = 'CookingClub_MembersByCuisine_Cuisine';
  static encoder = schema_Cuisine.encoder;
  static async createIndexes(_collection: Collection<never>) {
    return;
  }

  constructor(
    private repo: Repository<Cuisine>,
    private store: MongoProjectionStore,
  ) {}

  async save(cuisine: Cuisine): Promise<void> {
    await this.store.upsert(this.repo, cuisine);
  }

  async findOneById(_id: string): Promise<Cuisine | null> {
    const results = await this.store.find<Cuisine>(this.repo, { _id });
    return results[0] || null;
  }

  async findAll(): Promise<Cuisine[]> {
    return this.store.find<Cuisine>(this.repo, {});
  }
}

// --------------------

type Events = m.Infer<d.Infer<typeof decoder>>;

const decoder = accept([ApplicationSubmitted]);

const handler: ReactionHandler<Events> = ({
  event,
  store,
}): Future<AmbarResponse, void> =>
  Future.attemptP<void>(async () => {
    const { aggregate: membership } = await store.find(
      Membership,
      event.values.aggregateId,
    );

    if (membership.status !== 'Requested') {
      return;
    }

    const shouldApprove =
      event.values.yearsOfProfessionalExperience == 0 &&
      event.values.numberOfCookingBooksRead > 0;

    await store.emit({
      aggregate: Membership,
      event: new ApplicationEvaluated({
        type: 'ApplicationEvaluated',
        aggregateId: membership.aggregateId,
        evaluationOutcome: shouldApprove ? 'Approved' : 'Rejected',
      }),
    });
  }).mapRej((err) => new ErrorMustRetry(err.message));

const controller: ReactionController<Events> = { decoder, handler };
