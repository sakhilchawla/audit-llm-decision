#!/usr/bin/env node
import express from 'express';
import { AuditTrailController } from './controllers/AuditTrailController';
import { AuditTrailRepository } from './repositories/AuditTrailRepository';
import { errorHandler } from './middleware/errorHandler';
import { validateAuditTrail } from './middleware/validateRequest';
import { pool } from './config/database';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Initialize repositories and controllers
const auditTrailRepository = new AuditTrailRepository();
const auditTrailController = new AuditTrailController(auditTrailRepository);

async function startServer() {
  // Initialize database
  await auditTrailRepository.initialize().catch(console.error);

  // API version prefix
  const apiRouter = express.Router();

  // Routes
  apiRouter.post('/audit-trail', validateAuditTrail, auditTrailController.create.bind(auditTrailController));
  apiRouter.get('/audit-trail/:id', auditTrailController.getById.bind(auditTrailController));
  apiRouter.get('/audit-trail/model/:modelVersion', auditTrailController.getByModel.bind(auditTrailController));
  apiRouter.post('/claude/interaction', auditTrailController.createClaudeInteraction.bind(auditTrailController));

  // Mount API router with version prefix
  app.use('/api/v1', apiRouter);

  // Error handling
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`MCP LLM Audit Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
}); 