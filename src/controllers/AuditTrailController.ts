import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db.js';

interface LogRequest {
  prompt: string;
  response: string;
  modelType: string;
  modelVersion: string;
  inferences?: Record<string, unknown>;
  decisionPath?: Record<string, unknown>;
  finalDecision?: string;
  confidence?: number;
  metadata: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class AuditTrailController {
  protected static validateLogRequest(data: unknown): ValidationResult {
    const errors: string[] = [];
    const request = data as Partial<LogRequest>;

    if (!request.prompt) errors.push('prompt is required');
    if (!request.response) errors.push('response is required');
    if (!request.modelType) errors.push('modelType is required');
    if (!request.modelVersion) errors.push('modelVersion is required');
    if (!request.metadata) errors.push('metadata is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  protected static formatLogEntry(data: LogRequest): Record<string, unknown> {
    return {
      id: uuidv4(),
      prompt: data.prompt,
      response: data.response,
      model_type: data.modelType,
      model_version: data.modelVersion,
      inferences: data.inferences || null,
      decision_path: data.decisionPath || null,
      final_decision: data.finalDecision || null,
      confidence: data.confidence || null,
      metadata: data.metadata,
      created_at: new Date().toISOString()
    };
  }

  public static async logInteraction(req: Request, res: Response): Promise<void> {
    const validation = AuditTrailController.validateLogRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({ errors: validation.errors });
      return;
    }

    try {
      const logEntry = AuditTrailController.formatLogEntry(req.body as LogRequest);
      const result = await pool.query(
        `INSERT INTO model_interactions 
        (prompt, response, model_type, model_version, inferences, decision_path, final_decision, confidence, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at`,
        [
          logEntry.prompt,
          logEntry.response,
          logEntry.model_type,
          logEntry.model_version,
          logEntry.inferences,
          logEntry.decision_path,
          logEntry.final_decision,
          logEntry.confidence,
          logEntry.metadata,
          logEntry.created_at
        ]
      );

      res.json({
        id: result.rows[0].id,
        created_at: result.rows[0].created_at
      });
    } catch (error) {
      console.error('Error logging interaction:', error);
      res.status(500).json({ error: 'Failed to log interaction' });
    }
  }

  public static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const modelType = req.query.modelType as string;

      let query = 'SELECT * FROM model_interactions';
      const params: any[] = [];

      if (modelType) {
        query += ' WHERE model_type = $1';
        params.push(modelType);
      }

      query += ' ORDER BY created_at DESC';
      
      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM model_interactions${modelType ? ' WHERE model_type = $1' : ''}`,
        modelType ? [modelType] : []
      );

      // Get paginated results
      const result = await pool.query(
        `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      res.json({
        logs: result.rows,
        total: parseInt(countResult.rows[0].count)
      });
    } catch (error) {
      console.error('Error retrieving logs:', error);
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }
} 