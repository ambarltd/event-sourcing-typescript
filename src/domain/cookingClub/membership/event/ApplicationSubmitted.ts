import { CreationEvent } from '../../../../common/event/CreationEvent';
import { BaseEventOptions } from '../../../../common/event/EventOptions';
import { EventType } from '../../../../common/serialization';
import { Membership, MembershipStatus } from '../aggregate/membership';

export interface ApplicationSubmittedOptions extends BaseEventOptions {
  firstName: string;
  lastName: string;
  favoriteCuisine: string;
  yearsOfProfessionalExperience: number;
  numberOfCookingBooksRead: number;
}

@EventType('CookingClub_Membership_ApplicationSubmitted')
export class ApplicationSubmitted extends CreationEvent<Membership> {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly favoriteCuisine: string;
  public readonly yearsOfProfessionalExperience: number;
  public readonly numberOfCookingBooksRead: number;

  constructor(options: ApplicationSubmittedOptions) {
    super(options);

    this.firstName = options.firstName;
    this.lastName = options.lastName;
    this.favoriteCuisine = options.favoriteCuisine;
    this.yearsOfProfessionalExperience = options.yearsOfProfessionalExperience;
    this.numberOfCookingBooksRead = options.numberOfCookingBooksRead;
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
