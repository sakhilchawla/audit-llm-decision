import { Request, Response, NextFunction } from 'express';
import { APIError } from './errorHandler';

export const validateAuditTrail = (req: Request, res: Response, next: NextFunction) => {
  const required = ['modelVersion', 'featureSet', 'features', 'decisionPath', 'finalDecision', 'confidence'];
  
  for (const field of required) {
    if (!req.body[field]) {
      throw new APIError(400, `Missing required field: ${field}`);
    }
  }

  if (req.body.confidence < 0 || req.body.confidence > 1) {
    throw new APIError(400, 'Confidence must be between 0 and 1');
  }

  next();
}; 