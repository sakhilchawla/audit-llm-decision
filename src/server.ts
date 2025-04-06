#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AuditTrailController } from './controllers/AuditTrailController';
import { HealthController } from './controllers/HealthController';
import { pool } from './db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // limit each IP
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: process.env.CORS_METHODS || 'GET,POST',
  optionsSuccessStatus: 200
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(limiter);

// Routes
app.post('/api/v1/log', AuditTrailController.logInteraction);
app.get('/api/v1/logs', AuditTrailController.getLogs);
app.get('/health', HealthController.check);

export const initDB = async (): Promise<void> => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    // Create schema if it doesn't exist
    const schema = process.env.DB_SCHEMA || 'public';
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    console.log(`Database initialized with schema: ${schema}`);

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

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_interactions_model_type ON model_interactions(model_type);
      CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at DESC);
    `);
    console.log('Database indexes created');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export const startServer = async (port: number = Number(process.env.PORT) || 4000): Promise<void> => {
  try {
    await initDB();
    const server = app.listen(port, () => {
      console.log(`MCP Logging Server running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server startup failed:', error);
  });
}

export { app }; 