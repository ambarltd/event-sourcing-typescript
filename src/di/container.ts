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
import { Postgres, defaultPoolSettings } from '@/lib/postgres';
import { Mongo } from '@/lib/mongo';
import { ServerApiVersion } from 'mongodb';
import * as postgresEventStore from '@/app/postgresEventStore';
import { PostgresEventStore } from '@/app/postgresEventStore';
import { Hydrator, EventStore, EntryC } from '@/lib/eventSourcing/eventStore';
import { Future } from '@/lib/Future';
import { Response } from '@/lib/router';
import * as router from '@/lib/router';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';

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

type Dependencies = {
  withEventStore: (
    f: (store: EventStore) => Future<Response, Response>,
  ) => Future<Response, Response>;
  mongo: Mongo;
};

export async function configureDependencies(): Promise<Dependencies> {
  registerEnvironmentVariables();
  registerSingletons();
  registerScopedServices();

  const postgres = new Postgres({
    user: env.EVENT_STORE_USER,
    password: env.EVENT_STORE_PASSWORD,
    host: env.EVENT_STORE_HOST,
    port: env.EVENT_STORE_PORT,
    database: env.EVENT_STORE_DATABASE_NAME,
    poolSettings: defaultPoolSettings,
  });

  const mongo = new Mongo({
    user: env.MONGODB_PROJECTION_DATABASE_USERNAME,
    password: env.MONGODB_PROJECTION_DATABASE_PASSWORD,
    host: env.MONGODB_PROJECTION_HOST,
    port: env.MONGODB_PROJECTION_PORT,
    database: env.MONGODB_PROJECTION_DATABASE_NAME,
    settings: {
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 10 * 60 * 1000, // 10 minutes
      maxConnecting: 30,
      waitQueueTimeoutMS: 2000,
      replicaSet: 'rs0',
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    },
  });

  const table = env.EVENT_STORE_CREATE_TABLE_WITH_NAME;
  await postgres.withTransactionP((transaction) =>
    postgresEventStore.initialize({
      transaction,
      database: env.EVENT_STORE_DATABASE_NAME,
      table,
      replicationUserName:
        env.EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME,
      replicationUserPass:
        env.EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD,
      replicationPublication: env.EVENT_STORE_CREATE_REPLICATION_PUBLICATION,
    }),
  );

  const hydrator = new Hydrator([
    new EntryC(
      ApplicationSubmitted.aggregate,
      ApplicationSubmitted.schema,
      ApplicationSubmitted.type,
    ),
  ]);

  function withEventStore(
    f: (s: EventStore) => Future<Response, Response>,
  ): Future<Response, Response> {
    const onError = (_: Error): Response =>
      router.json({
        status: 500,
        content: { message: 'Internal Server Error' },
      });

    return postgres.withTransaction(onError, (t) =>
      f(new PostgresEventStore(t, hydrator, table)),
    );
  }

  return { withEventStore, mongo };
}
