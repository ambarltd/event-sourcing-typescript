import { BaseError } from './base';

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
