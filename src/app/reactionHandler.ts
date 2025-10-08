export {
  wrapWithEventStore,
  handleReaction,
  type ReactionHandler,
  type ReactionController,
};

import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Event, EventInfo } from '@/lib/eventSourcing/event';
import { Decoder } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as Ambar from '@/app/ambar';
import { AmbarResponse, ErrorMustRetry } from '@/app/ambar';
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

const onEventStoreError = (err: Error) => new Ambar.ErrorMustRetry(err.message);

type WithStoreGeneric = <E, T>(
  onError: (e: Error) => E,
  f: (store: EventStore) => Future<E, T>,
) => Future<E, T>;

type WithStoreConcrete = (
  f: (store: EventStore) => Future<ErrorMustRetry, void>,
) => Future<ErrorMustRetry, void>;

const wrapWithEventStore = (
  withEventStore: WithStoreGeneric,
): WithStoreConcrete =>
  function (f) {
    return withEventStore(onEventStoreError, (store) => f(store));
  };

function handleReaction<E extends Event<any>>(
  withEventStore: WithStoreConcrete,
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
          }).chainRej((r) =>
            r instanceof Ambar.Success
              ? Future.resolve(undefined)
              : r instanceof Ambar.ErrorMustRetry
                ? Future.reject(r)
                : (r satisfies never),
          ),
        ),
      )
      .bimap(Ambar.toResponse, (_) => Ambar.toResponse(new Ambar.Success())),
  );
}
