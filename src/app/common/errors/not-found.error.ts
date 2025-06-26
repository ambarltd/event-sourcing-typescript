import { BaseError } from './base';

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
