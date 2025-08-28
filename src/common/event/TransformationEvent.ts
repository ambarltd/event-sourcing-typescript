import { Event } from '@/common/event/Event';
import { Aggregate } from '@/common/aggregate/Aggregate';

export abstract class TransformationEvent<T extends Aggregate> extends Event {
  abstract transformAggregate(aggregate: T): T;
}
