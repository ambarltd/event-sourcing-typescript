export { handleProjection, decodeEvent };

import { Response } from '@/lib/router';
import { Event, EventInfo } from '@/lib/eventSourcing/event';
import { EventData } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as Ambar from '@/app/ambar';
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
}) => Future<Response, Response>;

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
    decodeEvent(decoder, req).chain(({ event, info }) =>
      withProjectionStore(mongo, (store) =>
        handler({
          event,
          info,
          projections,
          store,
        }),
      ),
    ),
  );
}

function decodeEvent<E>(
  decoder: Decoder<Maybe<E>>,
  req: express.Request,
): Future<Response, EventData<E>> {
  const bodyDecoder: Decoder<EventData<Maybe<E>>> =
    Ambar.payloadDecoder(decoder);

  const decoded: Result<string, EventData<Maybe<E>>> = decode(
    bodyDecoder,
    req.body,
  );

  if (decoded instanceof Failure) {
    return Future.reject(
      router.json({
        status: 400,
        content: { message: `Unable to decode command: ${decoded.error}` },
      }),
    );
  }

  if (decoded.value.event instanceof Nothing) {
    return Future.reject(
      router.json({
        status: 200,
        content: { message: 'Ignored' },
      }),
    );
  }

  return Future.resolve({
    info: decoded.value.info,
    event: decoded.value.event.value,
  });
}

function withProjectionStore(
  _mongo: Mongo,
  _f: (s: ProjectionStore) => Future<Response, Response>,
): Future<Response, Response> {
  throw new Error('TODO');
}
