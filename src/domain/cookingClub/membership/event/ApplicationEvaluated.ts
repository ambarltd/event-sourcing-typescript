import { TransformationEvent } from '../../../../common';
import { Membership, MembershipStatus } from '../aggregate/membership';

export class ApplicationEvaluated extends TransformationEvent<Membership> {
  constructor(
    eventId: string,
    aggregateId: string,
    aggregateVersion: number,
    correlationId: string,
    causationId: string,
    recordedOn: Date,
    public readonly evaluationOutcome: MembershipStatus,
  ) {
    super(
      eventId,
      aggregateId,
      aggregateVersion,
      correlationId,
      causationId,
      recordedOn,
    );
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
