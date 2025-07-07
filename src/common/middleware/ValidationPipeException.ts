export interface ValidationPipeError {
  field: string;
  constraints: string[];
  value: any;
}

export class ValidationPipeException extends Error {
  public readonly statusCode: number;
  public readonly details: ValidationPipeError[];

  constructor(
    message: string,
    statusCode: number,
    details: ValidationPipeError[] = [],
  ) {
    super(message);
    this.name = 'ValidationPipeException';
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationPipeException);
    }
  }

  static validationFailed(
    errors: ValidationPipeError[],
  ): ValidationPipeException {
    return new ValidationPipeException('Validation failed', 400, errors);
  }

  static internalError(originalError?: Error): ValidationPipeException {
    const message = originalError?.message || 'Internal validation error';
    const exception = new ValidationPipeException(message, 500);

    if (originalError?.stack) {
      exception.stack = originalError.stack;
    }

    return exception;
  }
}
