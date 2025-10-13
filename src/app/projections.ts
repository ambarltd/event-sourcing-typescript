export {
  type Repositories,
  type Projections,
  initializeRepositories,
  allProjections,
};

import {
  RepoCuisine,
  RepoMembershipApplication,
} from '@/domain/cookingClub/membership2/projection/membersByCuisine';
import { MongoProjectionStore } from '@/app/mongoProjectionStore';

// An object containing all initialized repositories.
// Repository instances are used for writing into collections.
// An instance of this type can live for the lifetime of the application
// as it does not hold an active transaction.
type Repositories = Unwrap<ReturnType<typeof initializeRepositories>>;

type Unwrap<A extends Promise<unknown>> =
  A extends Promise<infer B> ? B : never;

async function initializeRepositories(mongo: MongoProjectionStore) {
  return {
    [RepoCuisine.collectionName]: await mongo.createRepository(RepoCuisine),
    [RepoMembershipApplication.collectionName]: await mongo.createRepository(
      RepoMembershipApplication,
    ),
  };
}

// An object containing all initialized projections.
type Projections = ReturnType<typeof allProjections>;

function allProjections(repos: Repositories, mongo: MongoProjectionStore) {
  return {
    [RepoCuisine.collectionName]: new RepoCuisine(
      repos[RepoCuisine.collectionName],
      mongo,
    ),
    [RepoMembershipApplication.collectionName]: new RepoMembershipApplication(
      repos[RepoMembershipApplication.collectionName],
      mongo,
    ),
  };
}
