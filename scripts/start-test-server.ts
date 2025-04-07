import express from 'express';
import cors from 'cors';
import { pool } from '../src/db.js';
import { mcpLog } from '../src/utils/logging.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 4001;

async function initDB(): Promise<void> {
  try {
    mcpLog('info', 'Initializing test database...');
    
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
    mcpLog('info', 'Test database table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_interactions_model_type ON model_interactions(model_type);
      CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at DESC);
    `);
    mcpLog('info', 'Test database indexes created');
  } catch (error: any) {
    mcpLog('error', 'Test database initialization failed:', { error: error.message, stack: error.stack });
    throw error;
  }
}

async function startTestServer(): Promise<void> {
  try {
    await initDB();
    
    const server = app.listen(port, () => {
      mcpLog('info', `Test server running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      mcpLog('info', 'SIGTERM received. Shutting down test server gracefully...');
      server.close(async () => {
        await pool.end();
        mcpLog('info', 'Test server stopped and database connection closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      mcpLog('info', 'SIGINT received. Shutting down test server gracefully...');
      server.close(async () => {
        await pool.end();
        mcpLog('info', 'Test server stopped and database connection closed');
        process.exit(0);
      });
    });
  } catch (error: unknown) {
    mcpLog('error', 'Test server startup failed:', error);
    throw error;
  }
}

startTestServer().catch((error: unknown) => {
  mcpLog('error', 'Test server initialization failed:', error);
  process.exit(1);
}); 