import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const setupTestDatabase = async (): Promise<void> => {
  // Connect to default postgres database to create test database
  const adminPool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres'
  });

  try {
    // Create test database if it doesn't exist
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${process.env.DB_NAME}'
      AND pid <> pg_backend_pid();
    `);
    
    await adminPool.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);

    // Connect to test database and set up schema
    const testPool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME
    });

    // Create schema and tables
    await testPool.query('CREATE SCHEMA IF NOT EXISTS public');
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS model_interactions (
        id SERIAL PRIMARY KEY,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model_type VARCHAR(50) NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        inferences JSONB,
        decision_path JSONB,
        final_decision TEXT,
        confidence FLOAT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await testPool.query('CREATE INDEX IF NOT EXISTS idx_model_interactions_type_version ON model_interactions(model_type, model_version)');
    await testPool.query('CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at)');
    await testPool.query('CREATE INDEX IF NOT EXISTS idx_model_interactions_metadata ON model_interactions USING GIN (metadata)');

    await testPool.end();
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
};

const teardownTestDatabase = async (): Promise<void> => {
  const adminPool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres'
  });

  try {
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${process.env.DB_NAME}'
      AND pid <> pg_backend_pid();
    `);
    
    await adminPool.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
};

export { setupTestDatabase, teardownTestDatabase }; 