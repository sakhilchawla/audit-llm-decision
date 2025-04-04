import { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
}; 