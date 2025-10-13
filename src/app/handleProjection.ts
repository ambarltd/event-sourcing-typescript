export {
  type ProjectionHandler,
  type ProjectionController,
  handleProjection,
  decodeEvent,
};

import { Event, EventInfo } from '@/lib/eventSourcing/event';
import { EventData } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as Ambar from '@/lib/ambar';
import { AmbarResponse } from '@/lib/ambar';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Maybe, Nothing } from '@/lib/Maybe';
import { Projections, Repositories, allProjections } from '@/app/projections';
import {
  MongoProjectionStore,
  WithProjectionStore,
} from '@/app/projectionStore';

type ProjectionHandler<E> = (v: {
  event: E;
  info: EventInfo;
  projections: Projections;
  store: MongoProjectionStore;
}) => Future<AmbarResponse, void>;

type ProjectionController<E extends Event<any>> = {
  decoder: Decoder<Maybe<E>>;
  handler: ProjectionHandler<E>;
};

const onProjectionStoreError = (err: Error) =>
  new Ambar.ErrorMustRetry(err.message);

function handleProjection<E extends Event<any>>(
  withProjectionStore: WithProjectionStore,
  repositories: Repositories,
  { decoder, handler }: ProjectionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req)
      .chain(({ event, info }) =>
        withProjectionStore(onProjectionStoreError, (store) =>
          handler({
            event,
            info,
            projections: allProjections(repositories, store),
            store,
          }),
        ),
      )
      .map((_) => new Ambar.Success())
      .bimap(Ambar.toResponse, Ambar.toResponse),
  );
}

function decodeEvent<E>(
  decoder: Decoder<Maybe<E>>,
  req: express.Request,
): Future<AmbarResponse, EventData<E>> {
  const bodyDecoder: Decoder<EventData<Maybe<E>>> =
    Ambar.payloadDecoder(decoder);

  const decoded: Result<string, EventData<Maybe<E>>> = decode(
    bodyDecoder,
    req.body,
  );

  if (decoded instanceof Failure) {
    return Future.reject(
      new Ambar.ErrorMustRetry(`Unable to decode command: ${decoded.error}`),
    );
  }

  if (decoded.value.event instanceof Nothing) {
    // ignored
    return Future.reject(new Ambar.Success());
  }

  return Future.resolve({
    info: decoded.value.info,
    event: decoded.value.event.value,
  });
}
