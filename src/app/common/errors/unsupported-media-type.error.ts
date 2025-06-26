import { BaseError } from './base';

export class UnsupportedMediaTypeError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
