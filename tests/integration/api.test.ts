import request from 'supertest';
import { app } from '../../src/server';
import { pool } from '../../src/db';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database but don't start server
    await pool.query('SELECT 1');
  });

  describe('POST /api/v1/log', () => {
    it('should log a model interaction successfully', async () => {
      const response = await request(app)
        .post('/api/v1/log')
        .send({
          prompt: 'test prompt',
          response: 'test response',
          modelType: 'test-model',
          modelVersion: '1.0',
          metadata: {
            client: 'test-client',
            timestamp: new Date().toISOString()
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should reject invalid interaction data', async () => {
      const response = await request(app)
        .post('/api/v1/log')
        .send({
          prompt: 'test prompt'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/logs', () => {
    it('should retrieve logs with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/logs')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter logs by model type', async () => {
      const response = await request(app)
        .get('/api/v1/logs')
        .query({ modelType: 'test-model' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });
}); 