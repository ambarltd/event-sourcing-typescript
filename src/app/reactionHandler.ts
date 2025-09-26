export { handleReaction };

import { Response } from '@/lib/router';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Event } from '@/lib/eventSourcing/event';
import { Decoder } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Maybe } from '@/lib/Maybe';
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
  withEventStore: <T>(f: (s: EventStore) => T) => T,
  projections: Projections,
  services: Services,
  { decoder, handler }: ReactionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req).chain((event) =>
      withEventStore((store) =>
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
