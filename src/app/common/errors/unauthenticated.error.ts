import { BaseError } from './base';

export class UnauthenticatedError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
