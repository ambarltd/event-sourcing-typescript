export { handleCommand, type CommandController, type CommandHandler };

import { Response } from '@/lib/router';
import { EventStore } from '@/lib/eventSourcing/eventStore';
import { Decoder, decode } from '@/lib/json/decoder';
import * as express from 'express';
import * as router from '@/lib/router';
import { Future } from '@/lib/Future';
import { Result, Failure } from '@/lib/Result';
import { Projections } from '@/app/projections';
import { Services } from '@/app/services';

type CommandHandler<Command> = (v: {
  command: Command;
  store: EventStore;
  projections: Projections;
  services: Services;
}) => Future<Response, Response>;

type CommandController<Command> = {
  decoder: Decoder<Command>;
  handler: CommandHandler<Command>;
};

function handleCommand<Command>(
  withEventStore: (
    f: (store: EventStore) => Future<Response, Response>,
  ) => Future<Response, Response>,
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
