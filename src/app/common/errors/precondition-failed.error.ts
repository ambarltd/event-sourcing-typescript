import { BaseError } from './base';

export class PreconditionFailedError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
