import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Mock PostgreSQL pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return { default: { Pool: jest.fn(() => mPool) } };
});

// Clean up after all tests
afterAll(async () => {
  const pool = new Pool();
  await pool.end();
}); 