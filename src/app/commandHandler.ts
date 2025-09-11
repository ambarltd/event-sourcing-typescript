export { handleCommand };

import { Response } from '@/lib/router';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Postgres } from '@/lib/postgres';
import { PostgresEventStore } from '@/app/postgresEventStore';
import { Serializer } from '@/common/serializedEvent/Serializer';
import { Deserializer } from '@/common/serializedEvent/Deserializer';

type Projections = {};
type Services = {};

type CommandController<Command> = {
  decoder: Decoder<Command>;
  handler: (v: {
    command: Command;
    store: EventStore;
    projections: Projections;
    services: Services;
  }) => Future<Response, Response>;
};

function handleCommand<Command>(
  serializer: Serializer,
  deserializer: Deserializer,
  eventStoreTable: string,
  postgres: Postgres,
  services: Services,
  projections: Projections,
  { decoder, handler }: CommandController<Command>,
): express.Handler {
  return router.route((req) =>
    decodeCommand(decoder, req).chain((command) =>
      withEventStore(
        postgres,
        serializer,
        deserializer,
        eventStoreTable,
        (store) =>
          handler({
            command,
            store,
            projections,
            services,
          }),
      ),
    ),
  );
}

function decodeCommand<C>(
  decoder: Decoder<C>,
  req: express.Request,
): Future<Response, C> {
  const decoded: Result<string, C> = decode(decoder, req.body);
  if (decoded instanceof Failure) {
    return Future.reject(
      router.json({
        status: 400,
        content: { message: `Unable to decode command: ${decoded.error}` },
      }),
    );
  }

  return Future.resolve(decoded.value);
}

function withEventStore(
  postgres: Postgres,
  serializer: Serializer,
  deserializer: Deserializer,
  eventStoreTable: string,
  f: (s: EventStore) => Future<Response, Response>,
): Future<Response, Response> {
  const onError = (_: Error) =>
    router.json({
      status: 500,
      content: { message: 'Internal Server Error' },
    });

  return postgres.withTransaction(onError, (t) =>
    f(new PostgresEventStore(t, serializer, deserializer, eventStoreTable)),
  );
}
