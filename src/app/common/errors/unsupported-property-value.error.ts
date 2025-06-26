import { BaseError } from './base';

export class UnsupportedPropertyValueError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
