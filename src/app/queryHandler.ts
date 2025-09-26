export { handleQuery };

import { Response } from '@/lib/router';
import { Event } from '@/lib/eventSourcing/event';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';

type Projections = {};
type Services = {};

type QueryController<Query> = {
  decoder: Decoder<Query>;
  handler: (v: {
    query: Query;
    projections: Projections;
    services: Services;
  }) => Future<Response, Response>;
};

function handleQuery<E extends Event<any>>(
  projections: Projections,
  services: Services,
  { decoder, handler }: QueryController<E>,
): express.Handler {
  return router.route((req) =>
    decodeQuery(decoder, req).chain((query) =>
      handler({
        query,
        projections,
        services,
      }),
    ),
  );
}

function decodeQuery<Q>(
  decoder: Decoder<Q>,
  req: express.Request,
): Future<Response, Q> {
  const decoded: Result<string, Q> = decode(decoder, req.body);
  if (decoded instanceof Failure) {
    return Future.reject(
      router.json({
        status: 400,
        content: { message: `Unable to decode request: ${decoded.error}` },
      }),
    );
  }

  return Future.resolve(decoded.value);
}
