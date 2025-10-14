export { type Dependencies, configureDependencies, type Services };

import env from '@/app/environment';
import { Postgres, defaultPoolSettings } from '@/lib/postgres';
import { Mongo } from '@/lib/mongo';
import {
  MongoProjectionStore,
  WithProjectionStore,
} from '@/app/projectionStore';
import { EmailService } from '@/app/services/email';
import { FileStorageService } from '@/app/services/file-storage';
import { ServerApiVersion } from 'mongodb';
import * as eventStore from '@/app/eventStore';
import { PostgresEventStore, WithEventStore } from '@/app/eventStore';
import { schemas } from '@/app/events';
import { Repositories, initializeRepositories } from '@/app/projections';

type Dependencies = {
  withEventStore: WithEventStore;
  withProjectionStore: WithProjectionStore;
  services: Services;
  repositories: Repositories;
};

type Services = {
  fileStorage: FileStorageService;
  email: EmailService;
};

async function configureDependencies(): Promise<Dependencies> {
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
    eventStore.initialize({
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

  const withEventStore: WithEventStore = (onError, f) =>
    postgres.withTransaction(onError, (t) =>
      f(new PostgresEventStore(t, schemas, table)),
    );

  const withProjectionStore: WithProjectionStore = (onError, f) =>
    mongo.withTransaction(onError, (t) => f(new MongoProjectionStore(t)));

  const repositories = await mongo.withTransactionP(async (t) =>
    initializeRepositories(new MongoProjectionStore(t)),
  );

  const services = initializeServices();

  return {
    withEventStore,
    withProjectionStore,
    services,
    repositories,
  };
}

function initializeServices(): Services {
  const url = new URL(env.S3_ENDPOINT_URL);
  return {
    fileStorage: new FileStorageService({
      endPoint: url.hostname,
      port: url.port
        ? parseInt(url.port)
        : url.protocol === 'https:'
          ? 443
          : 80,
      useSSL: url.protocol === 'https:',
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      region: env.S3_REGION,
    }),
    email: new EmailService({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: true,
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
      defaultFrom: env.SMTP_FROM_EMAIL,
    }),
  };
}
