#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AuditTrailController } from './controllers/AuditTrailController.js';
import { HealthController } from './controllers/HealthController.js';
import { SchemaController } from './controllers/SchemaController.js';
import { pool, testConnection } from './db.js';
import dotenv from 'dotenv';
import { URL, fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Parse connection string and port from CLI args if provided
const connectionString = process.argv[2];
const portArg = process.argv[3];

// Check if running as main module (works in both ESM and CJS)
const isMainModule = process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts');

// Only require connection string in CLI mode
if (isMainModule && !connectionString && !process.env.DB_URL) {
  console.error('Usage: audit-llm-server postgresql://user:password@host:port/database [port]');
  process.exit(1);
}

// Parse connection string if provided
if (connectionString) {
  try {
    const dbUrl = new URL(connectionString);
    process.env.DB_USER = dbUrl.username;
    process.env.DB_PASSWORD = dbUrl.password;
    process.env.DB_HOST = dbUrl.hostname;
    process.env.DB_PORT = dbUrl.port;
    process.env.DB_NAME = dbUrl.pathname.slice(1); // Remove leading '/'
    
    // Parse application_name from search params
    const params = new URLSearchParams(dbUrl.search);
    const appName = params.get('application_name');
    if (appName) {
      process.env.DB_APPLICATION_NAME = appName;
    }
  } catch (err: any) {
    console.error('Invalid connection string:', err.message);
    process.exit(1);
  }
}

// Set port from command line if provided
if (portArg) {
  process.env.PORT = portArg;
}

console.log('Starting server with environment:', process.env.NODE_ENV);
console.log('Database configuration:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  application_name: process.env.DB_APPLICATION_NAME
});

const app = express();
let server: any = null;

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
app.get('/schema', SchemaController.getSchema);
app.get('/health', HealthController.check);
app.post('/api/v1/log', AuditTrailController.logInteraction);
app.get('/api/v1/logs', AuditTrailController.getLogs);

export const initDB = async (): Promise<void> => {
  try {
    console.log('Initializing database...');
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

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
    console.log('Database table created');

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

export const stopServer = async (): Promise<void> => {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(async () => {
        await pool.end();
        resolve();
      });
    });
    console.log('Server stopped and database connection closed');
  }
};

export const startServer = async (port: number = Number(process.env.PORT) || 4001): Promise<void> => {
  try {
    console.log('Starting server initialization...');
    await initDB();
    
    return new Promise((resolve, reject) => {
      console.log(`Attempting to start server on port ${port}...`);
      server = app.listen(port, () => {
        console.log(`MCP Logging Server running on port ${port}`);
        resolve();
      });

      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use`);
        }
        reject(error);
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('SIGTERM received. Shutting down gracefully...');
        await stopServer();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        console.log('SIGINT received. Shutting down gracefully...');
        await stopServer();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    throw error;
  }
};

// Start the server if this file is run directly
if (isMainModule) {
  console.log(`Starting server in ${process.env.NODE_ENV} mode...`);
  startServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
} else {
  console.log('Server module loaded but not started (imported as module)');
}

export { app, server }; 