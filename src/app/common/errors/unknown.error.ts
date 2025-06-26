import { BaseError } from './base';

export class UnknownError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
