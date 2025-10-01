export { schemas };

import { Schemas, CSchema, TSchema } from '@/lib/eventSourcing/eventStore';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership2/events/membership/applicationEvaluated';

const schemas = new Schemas([
  new CSchema(
    ApplicationSubmitted.aggregate,
    ApplicationSubmitted.schema,
    ApplicationSubmitted.type,
  ),
  new TSchema(
    ApplicationEvaluated.aggregate,
    ApplicationEvaluated.schema,
    ApplicationEvaluated.type,
  ),
]);
