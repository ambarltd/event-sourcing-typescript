export { handleProjection, decodeEvent };

import { Response } from '@/lib/router';
import { Event } from '@/lib/eventSourcing/event';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as d from '@/lib/json/decoder';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Maybe, Nothing } from '@/lib/Maybe';
import { Projections } from '@/app/projections';

type ProjectionStore = {};
type Mongo = {};

type ProjectionHandler<E> = (v: {
  event: E;
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
    decodeEvent(decoder, req).chain((event) =>
      withProjectionStore(mongo, (store) =>
        handler({
          event,
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
): Future<Response, E> {
  const bodyDecoder: Decoder<Maybe<E>> = d
    .object({ payload: decoder })
    .map((r) => r.payload);

  const decoded: Result<string, Maybe<E>> = decode(bodyDecoder, req.body);

  if (decoded instanceof Failure) {
    return Future.reject(
      router.json({
        status: 400,
        content: { message: `Unable to decode command: ${decoded.error}` },
      }),
    );
  }

  if (decoded.value instanceof Nothing) {
    return Future.reject(
      router.json({
        status: 200,
        content: { message: 'Ignored' },
      }),
    );
  }

  return Future.resolve(decoded.value.value);
}

function withProjectionStore(
  _mongo: Mongo,
  _f: (s: ProjectionStore) => Future<Response, Response>,
): Future<Response, Response> {
  throw new Error('TODO');
}
