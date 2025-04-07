import express from 'express';
import { mcpLog } from '../utils/logging.js';
import { pool } from '../db.js';

export const interactionRouter = express.Router();

interactionRouter.post('/log', async (req, res) => {
  try {
    const {
      prompt,
      response,
      modelType,
      modelVersion,
      inferences,
      decisionPath,
      finalDecision,
      confidence,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!prompt || !response || !modelType || !modelVersion) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: prompt, response, modelType, modelVersion'
        }
      });
    }

    // Format the log entry
    const logEntry = {
      prompt,
      response,
      model_type: modelType,
      model_version: modelVersion,
      inferences: inferences || null,
      decision_path: decisionPath || null,
      final_decision: finalDecision || null,
      confidence: confidence || null,
      metadata,
      created_at: new Date().toISOString()
    };

    // Insert into database
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

    mcpLog('info', 'Successfully logged interaction to database', { id: result.rows[0].id });
    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    mcpLog('error', 'Failed to log interaction:', error);
    res.status(500).json({
      error: {
        message: 'Failed to log interaction',
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

interactionRouter.get('/logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0, modelType } = req.query;

    let query = `
      SELECT * FROM model_interactions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (modelType) {
      query += ` AND model_type = $${params.length + 1}`;
      params.push(modelType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      logs: result.rows,
      total: result.rowCount,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    mcpLog('error', 'Failed to fetch logs:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
}); 