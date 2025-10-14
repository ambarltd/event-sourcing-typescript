export { type MembershipStatus, Membership, schema_MembershipStatus };

import { Aggregate, Id } from '@/lib/eventSourcing/event';
import { Schema } from '@/lib/json/schema';
import * as s from '@/lib/json/schema';

type MembershipStatus = 'Requested' | 'Approved' | 'Rejected';

const schema_MembershipStatus = s.oneOf(
  (str) => {
    switch (str) {
      case 'Requested':
        return s.stringLiteral('Requested') as Schema<MembershipStatus>;
      case 'Approved':
        return s.stringLiteral('Approved') as Schema<MembershipStatus>;
      case 'Rejected':
        return s.stringLiteral('Rejected') as Schema<MembershipStatus>;
      default:
        return str satisfies never;
    }
  },
  [
    s.stringLiteral('Requested') as Schema<MembershipStatus>,
    s.stringLiteral('Approved') as Schema<MembershipStatus>,
    s.stringLiteral('Rejected') as Schema<MembershipStatus>,
  ],
);

class Membership implements Aggregate<Membership> {
  constructor(
    readonly aggregateId: Id<Membership>,
    readonly aggregateVersion: number,
    public firstName: string,
    public lastName: string,
    public status: MembershipStatus,
  ) {}
}
