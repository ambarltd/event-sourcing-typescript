import { TransformationEvent } from '../../../../common';
import { Membership, MembershipStatus } from '../aggregate/membership';
import { EventRegistry } from '../../../../common';

export class ApplicationEvaluated extends TransformationEvent<Membership> {
  public readonly evaluationOutcome: MembershipStatus;

  static {
    EventRegistry.registerEvent(
      'CookingClub_Membership_ApplicationEvaluated',
      this,
      ['evaluationOutcome'],
    );
  }

  constructor(
    eventId: string,
    aggregateId: string,
    aggregateVersion: number,
    correlationId: string,
    causationId: string,
    recordedOn: Date,
    evaluationOutcome: MembershipStatus,
  ) {
    super(
      eventId,
      aggregateId,
      aggregateVersion,
      correlationId,
      causationId,
      recordedOn,
    );

    this.evaluationOutcome = evaluationOutcome;
  }

  transformAggregate(aggregate: Membership): Membership {
    return new Membership(
      this.aggregateId,
      this.aggregateVersion,
      aggregate.firstName,
      aggregate.lastName,
      this.evaluationOutcome,
    );
  }
}
