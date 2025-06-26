import { BaseError } from './base';

export class AmbiguousError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
