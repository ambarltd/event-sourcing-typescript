import { BaseError } from './base';

export class UnsupportedPropertyError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
