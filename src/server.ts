#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AuditTrailController } from './controllers/AuditTrailController.js';
import { HealthController } from './controllers/HealthController.js';
import { SchemaController } from './controllers/SchemaController.js';
import { pool, testConnection, initPool } from './db.js';
import dotenv from 'dotenv';
import { URL, fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Set default NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Parse connection string and port from CLI args if provided
const connectionString = process.argv[2];
const portArg = process.argv[3];

// Check if running directly (not imported as a module)
const isDirectExecution = process.argv.length >= 3 && (
  // Direct node execution
  process.argv[1].endsWith('server.js') ||
  process.argv[1].includes('dist/server.js') ||
  // NPX execution
  process.argv[1].includes('@audit-llm/server') ||
  process.argv[1].includes('audit-llm-server') ||
  process.argv[1].includes('node_modules/@audit-llm/server') ||
  process.argv[1].includes('node_modules/.bin/audit-llm-server') ||
  // Handle npx with specific versions
  /node_modules\/@audit-llm\/server(@[^/]+)?\/dist\/server\.js/.test(process.argv[1]) ||
  // Handle local npx
  process.argv[1].includes('/dist/server.js') ||
  // Handle all other cases where we have connection string argument
  process.argv[2].includes('postgresql://')
);

// MCP logging function
const mcpLog = (level: 'info' | 'error', message: string, data?: any) => {
  const logMessage = {
    jsonrpc: '2.0',
    method: 'log',
    params: {
      level,
      message,
      ...(data && { data })
    }
  };
  console.log(JSON.stringify(logMessage));
};

// MCP protocol handler
interface McpRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: number;
}

interface McpResponse {
  jsonrpc: '2.0';
  result: any;
  id: number;
}

interface McpError {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

// MCP method handlers
const mcpHandlers: {
  [key: string]: (params: any, id: number) => McpResponse;
} = {
  'initialize': (params: any, id: number) => ({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: '@audit-llm/server',
        version: process.env.npm_package_version || '1.0.16'
      },
      capabilities: {}
    },
    id
  }),
  'resources/list': (params: any, id: number) => ({
    jsonrpc: '2.0',
    result: {
      resources: []
    },
    id
  }),
  'prompts/list': (params: any, id: number) => ({
    jsonrpc: '2.0',
    result: {
      prompts: []
    },
    id
  }),
  'tools/list': (params: any, id: number) => ({
    jsonrpc: '2.0',
    result: {
      tools: []
    },
    id
  }),
  'heartbeat': (params: any, id: number) => ({
    jsonrpc: '2.0',
    result: null,
    id
  })
};

const handleMcpProtocol = () => {
  let initialized = false;
  let lastHeartbeat = Date.now();

  // Keep the process alive
  const interval = setInterval(() => {
    const now = Date.now();
    if (now - lastHeartbeat > 60000) {
      mcpLog('info', 'No heartbeat received in 60 seconds, but keeping server alive');
    }
  }, 30000);

  // Handle process termination
  const cleanup = async () => {
    clearInterval(interval);
    mcpLog('info', 'Shutting down gracefully...');
    await stopServer();
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Handle stdin
  process.stdin.on('data', (data) => {
    try {
      const messages = data.toString().trim().split('\n');
      
      for (const messageStr of messages) {
        if (!messageStr.trim()) continue;
        
        const message: McpRequest = JSON.parse(messageStr);
        
        // Handle initialization
        if (message.method === 'initialize') {
          initialized = true;
        }

        // Update heartbeat timestamp for any message
        lastHeartbeat = Date.now();

        // Handle notifications
        if (message.method.startsWith('notifications/')) {
          return;
        }

        // Handle methods with response
        if (message.id !== undefined) {
          const handler = mcpHandlers[message.method];
          if (handler) {
            const response = handler(message.params, message.id);
            process.stdout.write(JSON.stringify(response) + '\n');
          } else {
            const error: McpError = {
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Method ${message.method} not found`
              },
              id: message.id
            };
            process.stdout.write(JSON.stringify(error) + '\n');
          }
        }
      }
    } catch (err) {
      // Handle parse errors
      if (err instanceof SyntaxError) {
        mcpLog('error', 'Invalid JSON received:', { data: data.toString() });
        return;
      }
      
      mcpLog('error', 'Error handling MCP message:', err);
    }
  });

  // Handle stdin end
  process.stdin.on('end', () => {
    mcpLog('info', 'stdin stream ended');
    cleanup();
  });

  // Handle stdin errors
  process.stdin.on('error', (err) => {
    mcpLog('error', 'stdin stream error:', err);
  });
};

// Check if running in CLI mode
if (isDirectExecution && !connectionString) {
  mcpLog('error', 'Usage: audit-llm-server postgresql://user:password@host:port/database [port]');
  process.exit(1);
}

// Parse connection string if provided
if (connectionString) {
  try {
    const dbUrl = new URL(connectionString);
    process.env.DB_USER = decodeURIComponent(dbUrl.username);
    process.env.DB_PASSWORD = decodeURIComponent(dbUrl.password);
    process.env.DB_HOST = dbUrl.hostname;
    process.env.DB_PORT = dbUrl.port || '5432';
    process.env.DB_NAME = dbUrl.pathname.slice(1); // Remove leading '/'
    
    // Parse application_name from search params if present
    const params = new URLSearchParams(dbUrl.search);
    const appName = params.get('application_name');
    if (appName) {
      process.env.DB_APPLICATION_NAME = appName;
    }

    // Initialize pool with updated environment variables
    initPool();
  } catch (err: any) {
    mcpLog('error', 'Invalid connection string:', err.message);
    process.exit(1);
  }
}

// Set port from command line if provided
if (portArg) {
  process.env.PORT = portArg;
}

// Ensure we have an application name
if (!process.env.DB_APPLICATION_NAME) {
  process.env.DB_APPLICATION_NAME = 'audit_llm_server';
}

mcpLog('info', 'Starting server', {
  environment: process.env.NODE_ENV,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    application_name: process.env.DB_APPLICATION_NAME
  }
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
    mcpLog('info', 'Initializing database...');
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      mcpLog('error', 'Failed to connect to database. Please check your connection string and ensure PostgreSQL is running.');
      process.exit(1);
    }

    // Create schema if it doesn't exist
    const schema = process.env.DB_SCHEMA || 'public';
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`).catch(err => {
      mcpLog('error', `Failed to create schema: ${err.message}`);
      throw err;
    });
    mcpLog('info', `Database initialized with schema: ${schema}`);

    // Set search path
    await pool.query(`SET search_path TO ${schema}`).catch(err => {
      mcpLog('error', `Failed to set search path: ${err.message}`);
      throw err;
    });

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
    `).catch(err => {
      mcpLog('error', `Failed to create table: ${err.message}`);
      throw err;
    });
    mcpLog('info', 'Database table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_interactions_model_type ON model_interactions(model_type);
      CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at DESC);
    `).catch(err => {
      mcpLog('error', `Failed to create indexes: ${err.message}`);
      throw err;
    });
    mcpLog('info', 'Database indexes created');
  } catch (error: any) {
    mcpLog('error', 'Database initialization failed:', { error: error.message, stack: error.stack });
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
    mcpLog('info', 'Server stopped and database connection closed');
  }
};

export const startServer = async (port: number = Number(process.env.PORT) || 4001): Promise<void> => {
  try {
    mcpLog('info', 'Starting server initialization...');
    await initDB();
    
    return new Promise((resolve, reject) => {
      const tryPort = (currentPort: number) => {
        mcpLog('info', `Attempting to start server on port ${currentPort}...`);
        server = app.listen(currentPort, () => {
          mcpLog('info', `MCP Logging Server running on port ${currentPort}`);
          resolve();
        });

        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            mcpLog('info', `Port ${currentPort} is already in use, trying ${currentPort + 1}...`);
            server.close();
            tryPort(currentPort + 1);
          } else {
            reject(error);
          }
        });
      };

      tryPort(port);

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        mcpLog('info', 'SIGTERM received. Shutting down gracefully...');
        await stopServer();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        mcpLog('info', 'SIGINT received. Shutting down gracefully...');
        await stopServer();
        process.exit(0);
      });
    });
  } catch (error) {
    mcpLog('error', 'Server startup failed:', error);
    throw error;
  }
};

// Start the server only if running directly
if (isDirectExecution) {
  mcpLog('info', `Starting server in ${process.env.NODE_ENV} mode...`);
  // Initialize MCP protocol handler if running in MCP mode
  if (process.env.DB_APPLICATION_NAME?.includes('claude_desktop') || 
      process.env.DB_APPLICATION_NAME?.includes('cursor_mcp')) {
    handleMcpProtocol();
  }
  startServer().catch((error) => {
    mcpLog('error', 'Server startup failed:', error);
    process.exit(1);
  });
} else {
  mcpLog('info', 'Server module loaded (imported as module)');
}

export { app, server }; 