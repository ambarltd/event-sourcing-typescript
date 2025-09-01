// Environment variables
// All environment variables used by the entire program are here.
//
// This module ensures all environment variables are:
//
// - Type-checked
// - Decoded at the beginning of the program.
// - Handled consistently
// - Visible in a single place.

import * as D from '@/lib/json/decoder';

type Environment = D.Infer<typeof envDecoder>;

const string = D.string;
const number = D.stringNumber;

// All expected environment variables are checked at program initialization.
const envDecoder = D.object({
  AMBAR_HTTP_USERNAME: string,
  AMBAR_HTTP_PASSWORD: string,

  // Email
  SMTP_HOST: string,
  SMTP_PORT: number,
  SMTP_USERNAME: string,
  SMTP_PASSWORD: string,
  SMTP_FROM_EMAIL: string,

  // Event store
  EVENT_STORE_USER: string,
  EVENT_STORE_PASSWORD: string,
  EVENT_STORE_HOST: string,
  EVENT_STORE_PORT: number,
  EVENT_STORE_DATABASE_NAME: string,
  EVENT_STORE_CREATE_TABLE_WITH_NAME: string,
  EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME: string,
  EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD: string,
  EVENT_STORE_CREATE_REPLICATION_PUBLICATION: string,

  // MongoDB projection database
  MONGODB_PROJECTION_DATABASE_USERNAME: string,
  MONGODB_PROJECTION_DATABASE_PASSWORD: string,
  MONGODB_PROJECTION_HOST: string,
  MONGODB_PROJECTION_PORT: number,
  MONGODB_PROJECTION_DATABASE_NAME: string,

  // S3 file storage
  S3_ENDPOINT_URL: string,
  S3_ACCESS_KEY: string,
  S3_SECRET_KEY: string,
  S3_REGION: string,
});

const environment: Environment = D.decode(process.env, envDecoder).unwrap(
  (err) => {
    throw new Error(`Unable to parse environment variables:\n${err}`);
  },
);

export default environment;
