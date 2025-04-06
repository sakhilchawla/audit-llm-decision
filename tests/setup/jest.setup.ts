import { setupTestDatabase } from '../../scripts/setup-test-db';
import { initDB } from '../../src/server';
import { pool } from '../../src/db';

let isPoolClosed = false;

beforeAll(async () => {
  // Create test database
  await setupTestDatabase();
  
  // Initialize database schema and tables
  await initDB();
});

afterAll(async () => {
  // Close the database pool only if it hasn't been closed yet
  if (!isPoolClosed) {
    isPoolClosed = true;
    await pool.end();
  }
}); 