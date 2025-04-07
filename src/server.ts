#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { handleMcpProtocol } from './mcp.js';
import { mcpLog } from './utils/logging.js';
import { testConnection, initSchema } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API endpoint for logging interactions
app.post('/api/interactions', async (req, res) => {
  try {
    const {
      prompt,
      response,
      modelType,
      modelVersion,
      inferences,
      decisionPath,
      finalDecision,
      confidence,
      metadata
    } = req.body;

    // Validate required fields
    if (!prompt || !response || !modelType || !modelVersion) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'prompt, response, modelType, and modelVersion are required'
      });
    }

    // Log the interaction
    mcpLog('info', 'Logging interaction:', req.body);

    // Initialize database if needed
    await initSchema();

    // Return success
    res.json({
      success: true,
      message: 'Interaction logged successfully'
    });
  } catch (error) {
    mcpLog('error', 'Failed to log interaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  mcpLog('error', 'Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Check if running in MCP mode
const isMcpMode = process.argv.includes('--mcp');

async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      mcpLog('error', 'Failed to connect to database. Please check your connection string and ensure PostgreSQL is running.');
      if (!isMcpMode) {
        process.exit(1);
      }
    }

    if (isMcpMode) {
      mcpLog('info', 'Starting server in MCP mode');
      handleMcpProtocol();
    } else {
      const port = process.env.PORT || 4000;
      mcpLog('info', `Starting server in HTTP mode on port ${port}`);
      
      // Initialize database schema
      await initSchema();
      
      app.listen(port, () => {
        mcpLog('info', `Server listening on port ${port}`);
      });
    }
  } catch (error) {
    mcpLog('error', 'Failed to start server:', error);
    if (!isMcpMode) {
      process.exit(1);
    }
  }
}

startServer(); 