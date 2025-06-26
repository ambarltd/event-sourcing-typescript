import { BaseError } from './base';

export class InvalidCredentialsError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
