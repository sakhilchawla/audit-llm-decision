import { Client } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

async function setupTestDatabase() {
  // Connect to default postgres database to create test database
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: 'postgres'
  });

  try {
    await client.connect();
    
    // Force close all connections to the test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${process.env.DB_NAME}'
      AND pid <> pg_backend_pid();
    `);
    
    // Drop test database if it exists
    await client.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    
    // Create test database
    await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    
    console.log(`Test database ${process.env.DB_NAME} created successfully`);
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run setup if this script is run directly
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { setupTestDatabase }; 