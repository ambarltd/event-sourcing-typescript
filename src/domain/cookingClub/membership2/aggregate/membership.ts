import { Aggregate, Id } from '@/lib/eventSourcing/event';

export enum MembershipStatus {
  Requested = 'Requested',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export class Membership implements Aggregate<Membership> {
  constructor(
    readonly aggregateId: Id<Membership>,
    readonly aggregateVersion: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly status: MembershipStatus,
  ) {}
}
