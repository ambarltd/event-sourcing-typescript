export { handleCommand };

import { Response } from '@/lib/router';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';

type Projections = {};
type Services = {};

type CommandController<Command> = {
  decoder: Decoder<Command>;
  handler: (v: {
    command: Command;
    store: EventStore;
    projections: Projections;
    services: Services;
  }) => Future<Response, Response>;
};

function handleCommand<Command>(
  withEventStore: <T>(f: (store: EventStore) => T) => T,
  services: Services,
  projections: Projections,
  { decoder, handler }: CommandController<Command>,
): express.Handler {
  return router.route((req) =>
    decodeCommand(decoder, req).chain((command) =>
      withEventStore((store) =>
        handler({
          command,
          store,
          projections,
          services,
        }),
      ),
    ),
  );
}

function decodeCommand<C>(
  decoder: Decoder<C>,
  req: express.Request,
): Future<Response, C> {
  const decoded: Result<string, C> = decode(decoder, req.body);
  if (decoded instanceof Failure) {
    return Future.reject(
      router.json({
        status: 400,
        content: { message: `Unable to decode command: ${decoded.error}` },
      }),
    );
  }

  return Future.resolve(decoded.value);
}
