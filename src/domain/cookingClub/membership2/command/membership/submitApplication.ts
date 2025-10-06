export { controller };

import * as d from '@/lib/json/decoder';
import { CommandController, CommandHandler } from '@/app/commandHandler';
import { Future } from '@/lib/Future';
import { Response, json } from '@/lib/router';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';
import { IdGenerator } from '@/common/util/IdGenerator';

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
}): Future<Response, Response> => {
  store.emit(
    new ApplicationSubmitted({
      type: 'ApplicationSubmitted',
      aggregateId: IdGenerator.generateRandomId(),
      firstName: command.firstName,
      lastName: command.lastName,
      favouriteCousine: command.favouriteCousine,
      yearsOfProfessionalExperience: command.yearsOfProfessionalExperience,
      numberOfCookingBooksRead: command.numberOfCookingBooksRead,
    }),
  );

  return Future.resolve(
    json({
      content: { message: 'success' },
    }),
  );
};

const controller: CommandController<Command> = { decoder, handler };
