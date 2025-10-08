export { handleReaction, type ReactionHandler, type ReactionController };

import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Event, EventInfo } from '@/lib/eventSourcing/event';
import { Decoder } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as Ambar from '@/app/ambar';
import { AmbarResponse } from '@/app/ambar';
import { Future } from '@/lib/Future';
import { Maybe } from '@/lib/Maybe';
import { decodeEvent } from '@/app/projectionHandler';

type Projections = {};
type Services = {};

type ReactionController<E extends Event<any>> = {
  decoder: Decoder<Maybe<E>>;
  handler: ReactionHandler<E>;
};

type ReactionHandler<E> = (v: {
  event: E;
  info: EventInfo;
  projections: Projections;
  services: Services;
  store: EventStore;
}) => Future<AmbarResponse, void>;

function handleReaction<E extends Event<any>>(
  withEventStore: <T>(f: (s: EventStore) => T) => T,
  projections: Projections,
  services: Services,
  { decoder, handler }: ReactionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req)
      .chain(({ event, info }) =>
        withEventStore((store) =>
          handler({
            event,
            info,
            projections,
            services,
            store,
          }),
        ),
      )
      .map((_) => new Ambar.Success())
      .bimap(Ambar.toResponse, Ambar.toResponse),
  );
}
