export { handleProjection, decodeEvent };

import { Event, EventInfo } from '@/lib/eventSourcing/event';
import { EventData } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as Ambar from '@/app/ambar';
import { AmbarResponse } from '@/app/ambar';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Maybe, Nothing } from '@/lib/Maybe';
import { Projections } from '@/app/projections';

type ProjectionStore = {};
type Mongo = {};

type ProjectionHandler<E> = (v: {
  event: E;
  info: EventInfo;
  projections: Projections;
  store: ProjectionStore;
}) => Future<AmbarResponse, void>;

type ProjectionController<E extends Event<any>> = {
  decoder: Decoder<Maybe<E>>;
  handler: ProjectionHandler<E>;
};

function handleProjection<E extends Event<any>>(
  projections: Projections,
  mongo: Mongo,
  { decoder, handler }: ProjectionController<E>,
): express.Handler {
  return router.route((req) =>
    decodeEvent(decoder, req)
      .chain(({ event, info }) =>
        withProjectionStore(mongo, (store) =>
          handler({
            event,
            info,
            projections,
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

function withProjectionStore<T>(
  _mongo: Mongo,
  _f: (s: ProjectionStore) => Future<AmbarResponse, T>,
): Future<AmbarResponse, T> {
  throw new Error('TODO');
}
