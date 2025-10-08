export { controller };

import * as d from '@/lib/json/decoder';
import { accept } from '@/lib/eventSourcing/projection';
import { ReactionHandler, ReactionController } from '@/app/reactionHandler';
import { Future } from '@/lib/Future';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership2/events/membership/applicationSubmitted';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership2/events/membership/applicationEvaluated';
import { Membership } from '@/domain/cookingClub/membership2/aggregate/membership';
import { AmbarResponse, ErrorMustRetry } from '@/app/ambar';
import * as m from '@/lib/Maybe';

type Events = m.Infer<d.Infer<typeof decoder>>;

const decoder = accept([ApplicationSubmitted]);

const handler: ReactionHandler<Events> = ({
  event,
  store,
}): Future<AmbarResponse, void> =>
  Future.attemptP<void>(async () => {
    const { aggregate: membership } = await store.find(
      Membership,
      event.values.aggregateId,
    );

    if (membership.status !== 'Requested') {
      return;
    }

    const shouldApprove =
      event.values.yearsOfProfessionalExperience == 0 &&
      event.values.numberOfCookingBooksRead > 0;

    await store.emit({
      aggregate: Membership,
      event: new ApplicationEvaluated({
        type: 'ApplicationEvaluated',
        aggregateId: membership.aggregateId,
        evaluationOutcome: shouldApprove ? 'Approved' : 'Rejected',
      }),
    });
  }).mapRej((err) => new ErrorMustRetry(err.message));

const controller: ReactionController<Events> = { decoder, handler };
