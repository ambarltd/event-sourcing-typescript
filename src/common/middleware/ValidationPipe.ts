import { Request } from 'express';
import { plainToClass, ClassConstructor } from 'class-transformer';
import { validate, ValidatorOptions } from 'class-validator';
import { ValidationPipeException } from './ValidationPipeException';

export async function ValidationPipe<T extends object>(
  targetClass: ClassConstructor<T>,
  req: Request,
): Promise<T> {
  try {
    const dto = plainToClass(targetClass, req.body);

    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      whitelist: true,
      transform: true,
      transformOptions: {
        exposeDefaultValues: true,
      },
    } as ValidatorOptions);

    if (errors.length > 0) {
      const validationErrors = errors.map((error) => ({
        field: error.property,
        constraints: Object.values(error.constraints || {}),
        value: error.value,
      }));

      throw ValidationPipeException.validationFailed(validationErrors);
    }

    return dto;
  } catch (error) {
    if (error instanceof ValidationPipeException) {
      throw error;
    }

    throw ValidationPipeException.internalError(error as Error);
  }
}
