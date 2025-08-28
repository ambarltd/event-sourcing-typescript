import { TransformationEvent } from '../../../../common';
import { Membership, MembershipStatus } from '../aggregate/membership';
import { RegisterEvent, Serializable } from '../../../../common';

@RegisterEvent('CookingClub_Membership_ApplicationEvaluated')
export class ApplicationEvaluated extends TransformationEvent<Membership> {
  @Serializable
  public readonly evaluationOutcome: MembershipStatus;
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
