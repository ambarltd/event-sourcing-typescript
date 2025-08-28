import { CreationEvent } from '../../../../common';
import { Membership, MembershipStatus } from '../aggregate/membership';
import { EventRegistry } from '../../../../common';

export class ApplicationSubmitted extends CreationEvent<Membership> {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly favoriteCuisine: string;
  public readonly yearsOfProfessionalExperience: number;
  public readonly numberOfCookingBooksRead: number;

  static {
    EventRegistry.registerEvent(
      'CookingClub_Membership_ApplicationSubmitted',
      this,
      [
        'firstName',
        'lastName',
        'favoriteCuisine',
        'yearsOfProfessionalExperience',
        'numberOfCookingBooksRead',
      ],
    );
  }

  constructor(
    eventId: string,
    aggregateId: string,
    aggregateVersion: number,
    correlationId: string,
    causationId: string,
    recordedOn: Date,
    firstName: string,
    lastName: string,
    favoriteCuisine: string,
    yearsOfProfessionalExperience: number,
    numberOfCookingBooksRead: number,
  ) {
    super(
      eventId,
      aggregateId,
      aggregateVersion,
      correlationId,
      causationId,
      recordedOn,
    );

    this.firstName = firstName;
    this.lastName = lastName;
    this.favoriteCuisine = favoriteCuisine;
    this.yearsOfProfessionalExperience = yearsOfProfessionalExperience;
    this.numberOfCookingBooksRead = numberOfCookingBooksRead;
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
