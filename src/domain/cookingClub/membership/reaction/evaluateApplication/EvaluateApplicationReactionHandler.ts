import { ReactionHandler } from '../../../../../common/reaction/ReactionHandler';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { IdGenerator } from '../../../../../common/util/IdGenerator';
import { Event } from '../../../../../common/event/Event';
import { inject, injectable } from 'tsyringe';
import { ApplicationSubmitted } from '../../event/ApplicationSubmitted';
import { Membership, MembershipStatus } from '../../aggregate/membership';
import {
  ApplicationEvaluated,
  ApplicationEvaluatedProps,
} from '../../event/ApplicationEvaluated';

@injectable()
export class EvaluateApplicationReactionHandler extends ReactionHandler {
  constructor(
    @inject(PostgresTransactionalEventStore)
    eventStore: PostgresTransactionalEventStore,
  ) {
    super(eventStore);
  }

  async react(event: Event): Promise<void> {
    if (!(event instanceof ApplicationSubmitted)) {
      return;
    }

    const aggregateData =
      await this.postgresTransactionalEventStore.findAggregate<Membership>(
        event.aggregateId,
      );
    const membership = aggregateData.aggregate;

    if (membership.status !== MembershipStatus.Requested) {
      return;
    }

    const reactionEventId = IdGenerator.generateDeterministicId(
      `CookingClub_Membership_ReviewedApplication:${event.eventId}`,
    );
    if (
      await this.postgresTransactionalEventStore.doesEventAlreadyExist(
        reactionEventId,
      )
    ) {
      return;
    }

    const shouldApprove =
      event.yearsOfProfessionalExperience == 0 &&
      event.numberOfCookingBooksRead > 0;

    const evaluationOutcome = shouldApprove
      ? MembershipStatus.Approved
      : MembershipStatus.Rejected;

    const applicationEvaluatedProps: ApplicationEvaluatedProps = {
      eventId: reactionEventId,
      aggregateId: membership.aggregateId,
      aggregateVersion: membership.aggregateVersion + 1,
      correlationId: aggregateData.correlationIdOfLastEvent,
      causationId: aggregateData.eventIdOfLastEvent,
      recordedOn: new Date(),
      evaluationOutcome,
    };

    const reactionEvent = new ApplicationEvaluated(applicationEvaluatedProps);
    await this.postgresTransactionalEventStore.saveEvent(reactionEvent);
  }
}
