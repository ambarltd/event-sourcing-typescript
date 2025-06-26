import { BaseError } from './base';

export class LockedError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
