import { Request, Response, NextFunction } from 'express';
import { plainToClass, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';

export interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  forbidUnknownValues?: boolean;
  transformOptions?: {
    exposeDefaultValues?: boolean;
  };
}

export function ValidationPipe<T extends object>(
  targetClass: ClassConstructor<T>,
  options: ValidationPipeOptions = {
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    whitelist: true,
    transform: true,
    transformOptions: {
      exposeDefaultValues: true,
    },
  },
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToClass(targetClass, req.body);

      const errors = await validate(dto, {
        ...options,
      });

      if (errors.length > 0) {
        const errorMessages = errors.map((error) => ({
          field: error.property,
          constraints: Object.values(error.constraints || {}),
          value: error.value,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages,
        });
      }

      req.validatedBody = dto;
      next();
    } catch (error) {
      console.error('ValidationPipe error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
    }
  }
}
