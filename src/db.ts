import pg from 'pg';
import { mcpLog } from './utils/logging.js';

const { Pool } = pg;

// Create a new pool instance using individual environment variables
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'audit_llm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Handle pool errors
pool.on('error', (err) => {
  mcpLog('error', 'Unexpected error on idle client:', err);
  // Don't exit, let the application handle the error
});

// Test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    mcpLog('info', 'Database connection successful');
    return true;
  } catch (error) {
    mcpLog('error', 'Database connection failed:', error);
    return false;
  }
}

// Initialize the database schema and tables
export async function initSchema(): Promise<void> {
  try {
    // Create schema if it doesn't exist
    const schema = process.env.DB_SCHEMA || 'public';
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    mcpLog('info', `Database initialized with schema: ${schema}`);

    // Set search path
    await pool.query(`SET search_path TO ${schema}`);

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model_type VARCHAR(255) NOT NULL,
        model_version VARCHAR(255) NOT NULL,
        inferences JSONB,
        decision_path JSONB,
        final_decision TEXT,
        confidence FLOAT,
        metadata JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    mcpLog('info', 'Database table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_interactions_model_type ON model_interactions(model_type);
      CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at DESC);
    `);
    mcpLog('info', 'Database indexes created');
  } catch (error: any) {
    mcpLog('error', 'Database initialization failed:', { error: error.message, stack: error.stack });
    throw error;
  }
} 