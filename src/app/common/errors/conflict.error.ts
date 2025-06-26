import { BaseError } from './base';

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
