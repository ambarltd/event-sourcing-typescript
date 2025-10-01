export { ApplicationEvaluated };

import { Id, TransformationEvent, toSchema } from '@/lib/eventSourcing/event';
import * as s from '@/lib/json/schema';
import {
  Membership,
  schema_MembershipStatus,
} from '@/domain/cookingClub/membership2/aggregate/membership';

const type = 'ApplicationEvaluated' as const;
const args = s.object({
  type: s.stringLiteral(type),
  aggregateId: Id.schema(),
  evaluationOutcome: schema_MembershipStatus,
});

class ApplicationEvaluated implements TransformationEvent<Membership> {
  static readonly aggregate = Membership;
  static readonly type = type;
  static readonly schema = toSchema(this, args);
  constructor(readonly values: s.Infer<typeof args>) {}

  transformAggregate(aggregate: Membership): Membership {
    aggregate.status = this.values.evaluationOutcome;
    return aggregate;
  }
}
