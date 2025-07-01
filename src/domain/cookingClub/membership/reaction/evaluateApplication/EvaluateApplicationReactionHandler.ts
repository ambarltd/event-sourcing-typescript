import { ReactionHandler } from '../../../../../common/reaction/ReactionHandler';
import { PostgresTransactionalEventStore } from '../../../../../common/eventStore/PostgresTransactionalEventStore';
import { IdGenerator } from '../../../../../common/util/IdGenerator';
import { Event } from '../../../../../common/event/Event';
import { inject, injectable } from 'tsyringe';
import { ApplicationSubmitted } from '../../event/ApplicationSubmitted';
import { Membership, MembershipStatus } from '../../aggregate/membership';
import { ApplicationEvaluated } from '../../event/ApplicationEvaluated';

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
