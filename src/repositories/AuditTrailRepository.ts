import { AuditTrail } from '../types/AuditTrail';
import { pool } from '../config/database';

export class AuditTrailRepository {
  async initialize(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_trails (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMP,
        model_version VARCHAR(255),
        feature_set VARCHAR(255),
        features JSONB,
        decision_path JSONB,
        final_decision TEXT,
        confidence FLOAT
      )
    `);
  }

  async save(auditTrail: AuditTrail): Promise<void> {
    const query = `
      INSERT INTO audit_trails (
        id, timestamp, model_version, feature_set, 
        features, decision_path, final_decision, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await pool.query(query, [
      auditTrail.id,
      auditTrail.timestamp,
      auditTrail.modelVersion,
      auditTrail.featureSet,
      JSON.stringify(auditTrail.features),
      JSON.stringify(auditTrail.decisionPath),
      auditTrail.finalDecision,
      auditTrail.confidence
    ]);
  }

  async findById(id: string): Promise<AuditTrail | undefined> {
    const result = await pool.query(
      'SELECT * FROM audit_trails WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRowToAuditTrail(result.rows[0]);
  }

  async findByModelVersion(modelVersion: string): Promise<AuditTrail[]> {
    const result = await pool.query(
      'SELECT * FROM audit_trails WHERE model_version = $1',
      [modelVersion]
    );

    return result.rows.map(this.mapRowToAuditTrail);
  }

  private mapRowToAuditTrail(row: any): AuditTrail {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      modelVersion: row.model_version,
      featureSet: row.feature_set,
      features: row.features,
      decisionPath: row.decision_path,
      finalDecision: row.final_decision,
      confidence: row.confidence
    };
  }
} 