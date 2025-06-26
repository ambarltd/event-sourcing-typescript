import { randomUUID } from 'crypto';

import { PreconditionFailedError } from '../../errors';
import { Guard } from '../utils';

interface DomainEventMetadata {
  /** Timestamp when this domain event occurred */
  readonly timestamp?: number;

  /**
   * Causation id used to reconstruct execution order if needed
   */
  readonly causationId?: string;

  /**
   * User ID for debugging and logging purposes
   */
  readonly userId?: string;

  /**
   * Excludes replay of the event
   */
  readonly excludedInReplay?: boolean;
}

export type DomainEventProps<T> = Omit<T, 'id' | 'metadata'> & {
  aggregateId: string;
  metadata?: DomainEventMetadata;
};

export abstract class DomainEvent {
  readonly id: string;

  /** Aggregate ID where domain event occurred */
  readonly aggregateId: string;

  readonly metadata: DomainEventMetadata;

  constructor(props: DomainEventProps<unknown>) {
    if (Guard.isEmpty(props)) {
      throw new PreconditionFailedError(
        'DomainEvent props should not be empty'
      );
    }
    Object.assign(this, props);
    this.id = randomUUID();
    this.aggregateId = props.aggregateId;
    this.metadata = {
      causationId: props?.metadata?.causationId,
      timestamp: props?.metadata?.timestamp || Date.now(),
      userId: props?.metadata?.userId,
      excludedInReplay: props?.metadata?.excludedInReplay || false,
    };
  }
}
