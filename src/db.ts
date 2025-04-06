import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Create the connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mcp_audit',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  } : false,
  max: parseInt(process.env.DB_MAX_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '0'),
  application_name: process.env.DB_APPLICATION_NAME
});

// Log pool events
pool.on('connect', () => {
  mcpLog('info', 'New client connected to database');
});

pool.on('error', (err) => {
  mcpLog('error', 'Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    mcpLog('info', 'Successfully connected to database');
    client.release();
    return true;
  } catch (err) {
    mcpLog('error', 'Error connecting to the database:', err);
    return false;
  }
};

export { pool, testConnection }; 