export {
  controller,
  RepoCuisine,
  type Cuisine,
  RepoMembershipApplication,
  type MembershipApplication,
};

import * as d from '@/lib/json/decoder';
import * as s from '@/lib/json/schema';
import { Id } from '@/lib/eventSourcing/event';
import { accept } from '@/lib/eventSourcing/projection';
import {
  ProjectionHandler,
  ProjectionController,
} from '@/app/projectionHandler';
import { Future } from '@/lib/Future';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership2/events/membership/applicationEvaluated';
import { AmbarResponse, ErrorMustRetry } from '@/app/ambar';
import * as m from '@/lib/Maybe';
import {
  Repository,
  Collection,
  MongoProjectionStore,
} from '@/app/mongoProjectionStore';

// ------------------------------------------------
// Cuisine
// ------------------------------------------------

type Cuisine = s.Infer<typeof schema_Cuisine>;

const schema_Cuisine = s.object({
  name: s.string, // unique
  memberNames: s.array(s.string),
});

class RepoCuisine {
  static collectionName = 'CookingClub_MembersByCuisine_Cuisine' as const;
  static schema = schema_Cuisine;
  static async createIndexes(_collection: Collection<never>) {
    return;
  }
  static toId(c: Cuisine): string {
    return c.name;
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

// ------------------------------------------------
// Membership Application
// ------------------------------------------------

type MembershipApplication = s.Infer<typeof schema_MembershipApplication>;

const schema_MembershipApplication = s.object({
  id: Id.schema(),
  firstName: s.string,
  lastName: s.string,
  favouriteCuisine: s.string,
});

class RepoMembershipApplication {
  static collectionName =
    'CookingClub_MembersByCuisine_MembershipApplication' as const;
  static schema = schema_MembershipApplication;
  static async createIndexes(_collection: Collection<never>) {
    return;
  }
  static toId(c: MembershipApplication): string {
    return c.id.value;
  }

  constructor(
    private repo: Repository<MembershipApplication>,
    private store: MongoProjectionStore,
  ) {}

  async save(cuisine: MembershipApplication): Promise<void> {
    await this.store.upsert(this.repo, cuisine);
  }

  async getById(_id: Id<any>): Promise<MembershipApplication> {
    const results = await this.store.find<MembershipApplication>(this.repo, {
      _id,
    });
    const found = results[0] || null;
    if (found === null) {
      throw new Error(`Unknown membership application ID: ${_id.value}`);
    }
    return found;
  }
}

// ------------------------------------------------
// Projection
// ------------------------------------------------

type Events = m.Infer<d.Infer<typeof decoder>>;

const decoder = accept([ApplicationSubmitted, ApplicationEvaluated]);

const handler: ProjectionHandler<Events> = ({
  event,
  projections,
}): Future<AmbarResponse, void> =>
  Future.attemptP<void>(async () => {
    const repoCuisine = projections[RepoCuisine.collectionName];
    const repoMembershipApplication =
      projections[RepoMembershipApplication.collectionName];

    switch (true) {
      case event instanceof ApplicationSubmitted: {
        await repoMembershipApplication.save({
          id: event.values.aggregateId,
          firstName: event.values.firstName,
          lastName: event.values.lastName,
          favouriteCuisine: event.values.favouriteCousine,
        });
        return;
      }
      case event instanceof ApplicationEvaluated: {
        if (event.values.evaluationOutcome != 'Approved') return;
        const application = await repoMembershipApplication.getById(
          event.values.aggregateId,
        );

        const newCuisine = {
          name: application.favouriteCuisine,
          memberNames: [],
        };
        const cuisine =
          (await repoCuisine.findOneById(application.favouriteCuisine)) ||
          newCuisine;

        cuisine.memberNames.push(
          `${application.firstName} ${application.lastName}`,
        );
        await repoCuisine.save(cuisine);
        return;
      }
      default: {
        return event satisfies never;
      }
    }
  }).mapRej((err) => new ErrorMustRetry(err.message));

const controller: ProjectionController<Events> = { decoder, handler };
