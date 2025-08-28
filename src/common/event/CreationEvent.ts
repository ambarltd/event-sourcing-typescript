import { Event } from '@/common/event/Event';
import { Aggregate } from '@/common/aggregate/Aggregate';

export abstract class CreationEvent<T extends Aggregate> extends Event {
  abstract createAggregate(): T;
}
