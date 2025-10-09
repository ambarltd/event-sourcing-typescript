export {
  type Repositories,
  type Projections,
  initializeRepositories,
  allProjections,
};

import {
  RepoCuisine,
  MembersByCuisine,
} from '@/domain/cookingClub/membership2/projection/membersByCuisine';
import { MongoProjectionStore } from '@/app/mongoProjectionStore';

// An object containing all initialized repositories.
// Repository instances are used for writing into collections.
type Repositories = Unwrap<ReturnType<typeof initializeRepositories>>;

type Unwrap<A extends Promise<unknown>> =
  A extends Promise<infer B> ? B : never;

async function initializeRepositories(mongo: MongoProjectionStore) {
  return {
    [RepoCuisine.collectionName]: await mongo.createRepository(RepoCuisine),
  };
}

// An object containing all initialized projections.
// Projections are used for reading from collections.
type Projections = ReturnType<typeof allProjections>;

function allProjections(repos: Repositories, mongo: MongoProjectionStore) {
  return {
    membersByCuisine: new MembersByCuisine(
      new RepoCuisine(repos[RepoCuisine.collectionName], mongo),
    ),
  };
}
