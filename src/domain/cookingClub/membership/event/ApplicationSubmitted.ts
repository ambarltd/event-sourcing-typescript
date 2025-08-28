import { CreationEvent } from '@/common';
import {
  Membership,
  MembershipStatus,
} from '@/domain/cookingClub/membership/aggregate/membership';

export class ApplicationSubmitted extends CreationEvent<Membership> {
  constructor(
    eventId: string,
    aggregateId: string,
    aggregateVersion: number,
    correlationId: string,
    causationId: string,
    recordedOn: Date,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly favoriteCuisine: string,
    public readonly yearsOfProfessionalExperience: number,
    public readonly numberOfCookingBooksRead: number,
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
