import {
  ReactionHandler,
  PostgresTransactionalEventStore,
  IdGenerator,
  Event,
} from '@/common';
import { inject, injectable } from 'tsyringe';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership/event/ApplicationSubmitted';
import {
  Membership,
  MembershipStatus,
} from '@/domain/cookingClub/membership/aggregate/membership';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership/event/ApplicationEvaluated';

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

    if (shouldApprove) {
      const reactionEvent = new ApplicationEvaluated(
        reactionEventId,
        membership.aggregateId,
        membership.aggregateVersion + 1,
        aggregateData.correlationIdOfLastEvent,
        aggregateData.eventIdOfLastEvent,
        new Date(),
        MembershipStatus.Approved,
      );

      await this.postgresTransactionalEventStore.saveEvent(reactionEvent);
    } else {
      const reactionEvent = new ApplicationEvaluated(
        reactionEventId,
        membership.aggregateId,
        membership.aggregateVersion + 1,
        aggregateData.correlationIdOfLastEvent,
        aggregateData.eventIdOfLastEvent,
        new Date(),
        MembershipStatus.Rejected,
      );

      await this.postgresTransactionalEventStore.saveEvent(reactionEvent);
    }
  }
}
