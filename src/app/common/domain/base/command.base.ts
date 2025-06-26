import { randomUUID } from 'crypto';

import { PreconditionFailedError } from '../../errors';
import { Guard } from '../utils';

export type CommandProps<T> = Omit<T, 'id' | 'metadata'> & Partial<Command>;

interface CommandMetadata {
  /**
   * Causation id to reconstruct execution order if needed
   */
  readonly causationId?: string;

  /**
   * ID of a user who invoker the command. Can be useful for
   * logging and tracking execution of commands and events
   */
  readonly userId?: string;

  /**
   * Time when the command occurred. Mostly for tracing purposes
   */
  readonly timestamp: number;
}

export class Command {
  /**
   * Command id, in case if we want to save it
   * for auditing purposes and create a correlation/causation chain
   */
  readonly id: string;

  readonly metadata: CommandMetadata;

  constructor(props: CommandProps<unknown>) {
    if (Guard.isEmpty(props)) {
      throw new PreconditionFailedError('Command props should not be empty');
    }

    this.id = props.id || randomUUID();
    this.metadata = {
      causationId: props?.metadata?.causationId,
      timestamp: props?.metadata?.timestamp || Date.now(),
      userId: props?.metadata?.userId,
    };

    Object.assign(this, props);
  }
}
