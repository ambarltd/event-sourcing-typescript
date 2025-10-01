export { ApplicationSubmitted };

import { Id, CreationEvent, toSchema } from '@/lib/eventSourcing/event';
import * as s from '@/lib/json/schema';
import { Membership } from '@/domain/cookingClub/membership2/aggregate/membership';

const type = 'ApplicationSubmitted' as const;
const args = s.object({
  type: s.stringLiteral(type),
  aggregateId: Id.schema(),
  firstName: s.string,
  lastName: s.string,
  favouriteCousine: s.string,
  yearsOfProfessionalExperience: s.number,
  numberOfCookingBooksRead: s.number,
});

class ApplicationSubmitted implements CreationEvent<Membership> {
  static readonly aggregate = Membership;
  static readonly type = type;
  static readonly schema = toSchema(this, args);
  constructor(readonly values: s.Infer<typeof args>) {}

  createAggregate(): Membership {
    return new Membership(
      this.values.aggregateId,
      0,
      this.values.firstName,
      this.values.lastName,
      'Requested',
    );
  }
}
