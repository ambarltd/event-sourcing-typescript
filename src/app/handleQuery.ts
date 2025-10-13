export { handleQuery, type QueryController, type QueryHandler };

import { Response } from '@/lib/router';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Projections, Repositories, allProjections } from '@/app/projections';
import { WithProjectionStore } from '@/app/projectionStore';
import { internalServerError } from '@/app/responses';

type QueryHandler<Query> = (v: {
  query: Query;
  projections: Projections;
}) => Future<Response, Response>;

type QueryController<Query> = {
  decoder: Decoder<Query>;
  handler: QueryHandler<Query>;
};

const onProjectionStoreError = (_: Error) => internalServerError;

function handleQuery<Query>(
  withProjectionStore: WithProjectionStore,
  repositories: Repositories,
  { decoder, handler }: QueryController<Query>,
): express.Handler {
  return router.route((req) =>
    decodeQuery(decoder, req).chain((query) =>
      withProjectionStore(onProjectionStoreError, (store) =>
        handler({
          query,
          projections: allProjections(repositories, store),
        }),
      ),
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
