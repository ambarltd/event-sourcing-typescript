import { CreationEvent } from '../../../../common/event/CreationEvent';
import { EventProps } from '../../../../common/event';
import { EventType } from '../../../../common/serialization';
import { Membership, MembershipStatus } from '../aggregate/membership';

export type ApplicationSubmittedProps = EventProps<{
  firstName: string;
  lastName: string;
  favoriteCuisine: string;
  yearsOfProfessionalExperience: number;
  numberOfCookingBooksRead: number;
}>;

@EventType('CookingClub_Membership_ApplicationSubmitted')
export class ApplicationSubmitted extends CreationEvent<Membership> {
  public readonly firstName!: string;
  public readonly lastName!: string;
  public readonly favoriteCuisine!: string;
  public readonly yearsOfProfessionalExperience!: number;
  public readonly numberOfCookingBooksRead!: number;

  constructor(props: ApplicationSubmittedProps) {
    super(props);
  }

  createAggregate(): Membership {
    return new Membership(
      this.aggregateId,
      this.aggregateVersion,
      this.firstName,
      this.lastName,
      MembershipStatus.Requested,
    );
  }
}
