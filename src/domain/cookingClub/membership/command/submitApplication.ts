export { controller };

import * as d from '@/lib/json/decoder';
import { CommandController, CommandHandler } from '@/app/handleCommand';
import { Future } from '@/lib/Future';
import { Response, json } from '@/lib/router';
import { Id } from '@/lib/eventSourcing/event';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership/events/membership/applicationSubmitted';
import { Membership } from '@/domain/cookingClub/membership/aggregate/membership';
import { internalServerError } from '@/app/responses';

type Command = d.Infer<typeof decoder>;
const decoder = d.object({
  firstName: d.string,
  lastName: d.string,
  favouriteCousine: d.string,
  yearsOfProfessionalExperience: d.number,
  numberOfCookingBooksRead: d.number,
});

const handler: CommandHandler<Command> = ({
  command,
  store,
}): Future<Response, Response> =>
  Future.attemptP(() =>
    store.emit({
      aggregate: ApplicationSubmitted.aggregate,
      event: new ApplicationSubmitted({
        type: ApplicationSubmitted.type,
        aggregateId: Id.random<Membership>(),
        firstName: command.firstName,
        lastName: command.lastName,
        favouriteCousine: command.favouriteCousine,
        yearsOfProfessionalExperience: command.yearsOfProfessionalExperience,
        numberOfCookingBooksRead: command.numberOfCookingBooksRead,
      }),
    }),
  ).bimap(
    (_) => internalServerError,
    (_) =>
      json({
        content: { message: 'success' },
      }),
  );

const controller: CommandController<Command> = { decoder, handler };
