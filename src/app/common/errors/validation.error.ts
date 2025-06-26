import { BaseError } from './base';

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
