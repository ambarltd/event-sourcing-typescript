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
import * as Ambar from '@/lib/ambar';
import { AmbarResponse, ErrorMustRetry } from '@/lib/ambar';
import { Future } from '@/lib/Future';
import { Maybe } from '@/lib/Maybe';
import { decodeEvent } from '@/app/handleProjection';
import { Services } from '@/app/integrations';
import { Repositories, Projections, allProjections } from '@/app/projections';
import { WithProjectionStore, Mode } from '@/app/projectionStore';

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

const onStoreError = (err: Error) => new Ambar.ErrorMustRetry(err.message);

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
    return withEventStore(onStoreError, (store) => f(store));
  };

function handleReaction<E extends Event<any>>(
  withEventStore: WithStoreConcrete,
  withProjectionStore: WithProjectionStore,
  services: Services,
  repositories: Repositories,
  { decoder, handler }: ReactionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req)
      .chain(({ event, info }) =>
        withProjectionStore(onStoreError, Mode.ReadOnly, (projectionStore) =>
          withEventStore((store) =>
            handler({
              event,
              info,
              projections: allProjections(repositories, projectionStore),
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
        ),
      )
      .bimap(Ambar.toResponse, (_) => Ambar.toResponse(new Ambar.Success())),
  );
}
