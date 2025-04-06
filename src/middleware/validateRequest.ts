import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface ValidationSchema {
  required?: string[];
  optional?: string[];
  types?: Record<string, string>;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { required = [], optional = [], types = {} } = schema;
      const body = req.body;

      // Check required fields
      for (const field of required) {
        if (!(field in body)) {
          throw new AppError(400, `Missing required field: ${field}`);
        }
        if (body[field] === null || body[field] === undefined) {
          throw new AppError(400, `Field ${field} cannot be null or undefined`);
        }
      }

      // Type validation for all fields
      for (const [field, expectedType] of Object.entries(types)) {
        if (field in body) {
          const value = body[field];
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          
          if (actualType !== expectedType) {
            throw new AppError(400, `Field ${field} must be of type ${expectedType}, got ${actualType}`);
          }
        }
      }

      // Remove unexpected fields
      const allowedFields = new Set([...required, ...optional]);
      for (const field in body) {
        if (!allowedFields.has(field)) {
          delete body[field];
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 