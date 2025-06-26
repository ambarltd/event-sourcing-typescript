import { BaseError } from './base';

export class UnsupportedTypeError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
