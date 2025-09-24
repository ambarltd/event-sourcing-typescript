export { handleProjection, decodeEvent, accept };

import { Response } from '@/lib/router';
import { Event } from '@/lib/eventSourcing/event';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import * as d from '@/lib/json/decoder';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Maybe, Nothing, Just } from '@/lib/Maybe';
import { Schema } from '@/lib/json/schema';
import * as s from '@/lib/json/schema';

type Projections = {};
type ProjectionStore = {};
type Mongo = {};

type ProjectionController<E extends Event<any>> = {
  decoder: Decoder<Maybe<E>>;
  handler: (v: {
    event: E;
    projections: Projections;
    store: ProjectionStore;
  }) => Future<Response, Response>;
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

type EventClass = { type: string; schema: Schema<any> };

// Given some event classes, creates a decoder for those classes.
// Makes sure to error if decoding those class object fail, but
// succeeds if the encoded event was of another class.
function accept<T extends [...EventClass[]]>(
  ts: T,
): Decoder<Maybe<s.Infer<T[number]['schema']>>> {
  type Ty = s.Infer<T[number]['schema']>;
  return d.object({ type: d.string }).then(({ type: ty }) => {
    const c: undefined | EventClass = ts.find((t) => t.type === ty);
    return c
      ? (c.schema.decoder.map(Just) as Decoder<Maybe<Ty>>)
      : d.succeed(Nothing());
  });
}
