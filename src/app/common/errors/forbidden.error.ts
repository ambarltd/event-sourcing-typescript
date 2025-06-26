import { BaseError } from './base';

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
