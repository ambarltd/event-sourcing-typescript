import { TransformationEvent } from '../../../../common/event/TransformationEvent';
import { EventProps } from '../../../../common/event';
import { EventType } from '../../../../common/serialization';
import { Membership, MembershipStatus } from '../aggregate/membership';

export type ApplicationEvaluatedProps = EventProps<{
  evaluationOutcome: MembershipStatus;
}>;

@EventType('CookingClub_Membership_ApplicationEvaluated')
export class ApplicationEvaluated extends TransformationEvent<Membership> {
  public readonly evaluationOutcome!: MembershipStatus;

  constructor(props: ApplicationEvaluatedProps) {
    super(props);
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
