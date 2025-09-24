export { handleReaction };

import { Response } from '@/lib/router';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Event } from '@/lib/eventSourcing/event';
import { Decoder } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Maybe } from '@/lib/Maybe';
import { Postgres } from '@/lib/postgres';
import { PostgresEventStore } from '@/app/postgresEventStore';
import { Serializer } from '@/common/serializedEvent/Serializer';
import { Deserializer } from '@/common/serializedEvent/Deserializer';
import { decodeEvent } from '@/app/projectionHandler';

type Projections = {};
type Services = {};

type ReactionController<E extends Event<any>> = {
  decoder: Decoder<Maybe<E>>;
  handler: (v: {
    event: E;
    projections: Projections;
    services: Services;
    store: EventStore;
  }) => Future<Response, Response>;
};

function handleReaction<E extends Event<any>>(
  projections: Projections,
  services: Services,
  postgres: Postgres,
  serializer: Serializer,
  deserializer: Deserializer,
  eventStoreTable: string,
  { decoder, handler }: ReactionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req).chain((event) =>
      withEventStore(
        postgres,
        serializer,
        deserializer,
        eventStoreTable,
        (store) =>
          handler({
            event,
            projections,
            services,
            store,
          }),
      ),
    ),
  );
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
