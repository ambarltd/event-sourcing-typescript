import { container, Lifecycle } from 'tsyringe';
import {
  Serializer,
  Deserializer,
  PostgresConnectionPool,
  MongoSessionPool,
  PostgresTransactionalEventStore,
  MongoTransactionalProjectionOperator,
  MongoInitializer,
  PostgresInitializer,
  EmailService,
  FileStorageService,
} from '@/common';
import { constructor } from 'tsyringe/dist/typings/types';
import { SubmitApplicationCommandController } from '@/domain/cookingClub/membership/command/submitApplication';
import { SubmitApplicationCommandHandler } from '@/domain/cookingClub/membership/command/submitApplication';
import { EvaluateApplicationReactionHandler } from '@/domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionHandler';
import { EvaluateApplicationReactionController } from '@/domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionController';
import { MembersByCuisineProjectionHandler } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembersByCuisineProjectionHandler';
import { MembershipApplicationRepository } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembershipApplicationRepository';
import { CuisineRepository } from '@/domain/cookingClub/membership/projection/membersByCuisine/CuisineRepository';
import env from '@/app/environment';

function registerEnvironmentVariables() {
  const postgresConnectionString =
    `postgresql://${env.EVENT_STORE_USER}:${env.EVENT_STORE_PASSWORD}@` +
    `${env.EVENT_STORE_HOST}:${env.EVENT_STORE_PORT}/` +
    `${env.EVENT_STORE_DATABASE_NAME}`;
  container.register('postgresConnectionString', {
    useValue: postgresConnectionString,
  });
  container.register('eventStoreTable', {
    useValue: env.EVENT_STORE_CREATE_TABLE_WITH_NAME,
  });
  container.register('eventStoreDatabaseName', {
    useValue: env.EVENT_STORE_DATABASE_NAME,
  });
  container.register('eventStoreCreateReplicationUserWithUsername', {
    useValue: env.EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME,
  });
  container.register('eventStoreCreateReplicationUserWithPassword', {
    useValue: env.EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD,
  });
  container.register('eventStoreCreateReplicationPublication', {
    useValue: env.EVENT_STORE_CREATE_REPLICATION_PUBLICATION,
  });

  const mongoConnectionString =
    `mongodb://${env.MONGODB_PROJECTION_DATABASE_USERNAME}:${env.MONGODB_PROJECTION_DATABASE_PASSWORD}@` +
    `${env.MONGODB_PROJECTION_HOST}:${env.MONGODB_PROJECTION_PORT}/` +
    `${env.MONGODB_PROJECTION_DATABASE_NAME}` +
    '?serverSelectionTimeoutMS=10000&connectTimeoutMS=10000&authSource=admin';
  const mongoDatabaseName = env.MONGODB_PROJECTION_DATABASE_NAME;
  container.register('mongoConnectionString', {
    useValue: mongoConnectionString,
  });
  container.register('mongoDatabaseName', { useValue: mongoDatabaseName });
}

function registerSingletons() {
  // common/serializedEvent
  container.registerSingleton(Serializer);
  container.registerSingleton(Deserializer);

  // common/util
  container.registerSingleton(PostgresConnectionPool);
  container.registerSingleton(MongoSessionPool);
  container.registerSingleton(MongoInitializer);
  container.registerSingleton(PostgresInitializer);

  // common/services
  container.registerSingleton(EmailService);
  container.registerSingleton(FileStorageService);
}

function registerScoped<T>(token: constructor<T>) {
  container.register(token, token, { lifecycle: Lifecycle.ContainerScoped });
}

function registerScopedServices() {
  // common/eventStore
  registerScoped(PostgresTransactionalEventStore);

  // common/projection
  registerScoped(MongoTransactionalProjectionOperator);

  // domain/cookingClub/command/submitApplication
  registerScoped(SubmitApplicationCommandController);
  registerScoped(SubmitApplicationCommandHandler);

  // domain/cookingClub/projection/membersByCuisine
  registerScoped(CuisineRepository);
  registerScoped(MembersByCuisineProjectionHandler);
  registerScoped(MembershipApplicationRepository);

  // domain/cookingClub/reaction/evaluateApplication
  registerScoped(EvaluateApplicationReactionController);
  registerScoped(EvaluateApplicationReactionHandler);
}

export function configureDependencies() {
  registerEnvironmentVariables();
  registerSingletons();
  registerScopedServices();
}

