import { CreationEvent } from '../../../../common';
import { Membership, MembershipStatus } from '../aggregate/membership';
import { RegisterEvent, Serializable } from '../../../../common';

@RegisterEvent('CookingClub_Membership_ApplicationSubmitted')
export class ApplicationSubmitted extends CreationEvent<Membership> {
  @Serializable
  public readonly firstName: string;
  @Serializable
  public readonly lastName: string;
  @Serializable
  public readonly favoriteCuisine: string;
  @Serializable
  public readonly yearsOfProfessionalExperience: number;
  @Serializable
  public readonly numberOfCookingBooksRead: number;

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
