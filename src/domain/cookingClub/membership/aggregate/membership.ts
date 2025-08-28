import { Aggregate } from '@/common';

export enum MembershipStatus {
  Requested = 'Requested',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export class Membership extends Aggregate {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly status: MembershipStatus,
  ) {
    super(aggregateId, aggregateVersion);
  }
}
