export { controller };

import * as d from '@/lib/json/decoder';
import { CommandController, CommandHandler } from '@/app/commandHandler';
import { Future } from '@/lib/Future';
import { Response, json } from '@/lib/router';

type Command = d.Infer<typeof decoder>;
const decoder = d.object({
  firstName: d.string,
  lastName: d.string,
  favouriteCousine: d.string,
  yearsOfProfessionalExperience: d.number,
  numberOfCookingBooksRead: d.number,
});

const handler: CommandHandler<Command> = (_): Future<Response, Response> => {
  return Future.resolve(
    json({
      content: { message: 'success' },
    }),
  );
};

const controller: CommandController<Command> = { decoder, handler };
