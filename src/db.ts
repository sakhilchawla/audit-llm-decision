import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
  application_name: process.env.DB_APPLICATION_NAME || 'mcp_logger'
});

// Log pool events
pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to database');
    client.release();
    return true;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    return false;
  }
};

export { pool, testConnection }; 