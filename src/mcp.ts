import { mcpLog } from './utils/logging.js';
import { pool, initSchema } from './db.js';

interface McpMessage {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: number | null;
}

interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

// Cache responses for frequently requested methods
const cachedResponses = {
  'resources/list': {
    jsonrpc: '2.0',
    result: {
      resources: []
    }
  },
  'prompts/list': {
    jsonrpc: '2.0',
    result: {
      prompts: []
    }
  }
};

async function handleMcpMessage(message: McpMessage) {
  const tools: Tool[] = [{
    name: 'interaction/log',
    description: 'Log an LLM interaction with detailed context',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The input prompt or query'
        },
        response: {
          type: 'string',
          description: 'The LLM response'
        },
        modelType: {
          type: 'string',
          description: 'The type of model used (e.g. claude-3-opus)'
        },
        modelVersion: {
          type: 'string',
          description: 'The version of the model'
        },
        inferences: {
          type: 'object',
          description: 'Any inferences made during processing'
        },
        decisionPath: {
          type: 'object',
          description: 'The path taken to reach the decision'
        },
        finalDecision: {
          type: 'string',
          description: 'The final decision or conclusion'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score between 0 and 1'
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata about the interaction'
        }
      },
      required: ['prompt', 'response', 'modelType', 'modelVersion']
    }
  }];

  const handlers: Record<string, (params: any, id: number | null) => Promise<any>> = {
    'initialize': async (params, id) => {
      // Initialize database schema on first connection
      await initSchema();
      
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: '@audit-llm/server',
            version: '1.1.7'
          },
          capabilities: {
            tools: true,
            resources: true,
            prompts: true
          }
        },
        id
      };
    },
    'tools/list': async (params, id) => ({
      jsonrpc: '2.0',
      result: {
        tools
      },
      id
    }),
    'resources/list': async (params, id) => ({
      ...cachedResponses['resources/list'],
      id
    }),
    'prompts/list': async (params, id) => ({
      ...cachedResponses['prompts/list'],
      id
    }),
    'heartbeat': async (params, id) => ({
      jsonrpc: '2.0',
      result: null,
      id
    }),
    'interaction/log': async (params, id) => {
      mcpLog('info', 'Logging interaction:', params);
      try {
        // Format the log entry
        const logEntry = {
          prompt: params.prompt,
          response: params.response,
          model_type: params.modelType,
          model_version: params.modelVersion,
          inferences: params.inferences || null,
          decision_path: params.decisionPath || null,
          final_decision: params.finalDecision || null,
          confidence: params.confidence || null,
          metadata: params.metadata || {},
          created_at: new Date().toISOString()
        };

        // Insert into database
        const result = await pool.query(
          `INSERT INTO model_interactions 
          (prompt, response, model_type, model_version, inferences, decision_path, final_decision, confidence, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, created_at`,
          [
            logEntry.prompt,
            logEntry.response,
            logEntry.model_type,
            logEntry.model_version,
            logEntry.inferences,
            logEntry.decision_path,
            logEntry.final_decision,
            logEntry.confidence,
            logEntry.metadata,
            logEntry.created_at
          ]
        );

        mcpLog('info', 'Successfully logged interaction to database', { id: result.rows[0].id });
        return {
          jsonrpc: '2.0',
          result: {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at
          },
          id
        };
      } catch (error) {
        mcpLog('error', 'Failed to log interaction:', error);
        return {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Failed to log interaction',
            data: error instanceof Error ? error.message : String(error)
          },
          id
        };
      }
    }
  };

  try {
    const handler = handlers[message.method];
    if (!handler) {
      const response = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        },
        id: message.id || null
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    const response = await handler(message.params, typeof message.id === 'number' ? message.id : null);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    mcpLog('error', 'Error handling MCP message:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error)
      },
      id: message.id || null
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
}

export function handleMcpProtocol() {
  mcpLog('info', 'Starting in MCP mode via stdin/stdout');

  // Handle process termination
  let isShuttingDown = false;
  let lastHeartbeat = Date.now();

  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    mcpLog('info', 'Shutting down gracefully...');
    clearInterval(heartbeat);
    await pool.end();
    mcpLog('info', 'Server stopped and database connection closed');
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', (error) => {
    mcpLog('error', 'Uncaught exception:', error);
    cleanup();
  });

  // Keep the connection alive with a proper JSON-RPC notification
  const heartbeat = setInterval(() => {
    if (!isShuttingDown) {
      try {
        const now = Date.now();
        if (now - lastHeartbeat > 60000) {
          mcpLog('info', 'No heartbeat received in 60 seconds, but keeping server alive');
        }
        const notification = {
          jsonrpc: '2.0',
          method: 'server/heartbeat',
          params: null
        };
        process.stdout.write(JSON.stringify(notification) + '\n');
      } catch (error) {
        mcpLog('error', 'Error sending heartbeat:', error);
      }
    }
  }, 30000);

  // Handle stdin
  process.stdin.on('data', (data) => {
    if (isShuttingDown) return;

    try {
      const messages = data.toString().trim().split('\n');
      
      for (const messageStr of messages) {
        if (!messageStr.trim()) {
          mcpLog('debug', 'Skipping empty line');
          continue;
        }

        // Log raw message for debugging
        mcpLog('debug', 'Raw message received:', { message: messageStr });

        // Try to parse the message
        let message;
        try {
          message = JSON.parse(messageStr);
        } catch (parseError: any) {
          mcpLog('error', 'JSON parse error:', { error: parseError, message: messageStr });
          const parseErrorResponse = {
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error',
              data: `Invalid JSON: ${parseError.message}`
            },
            id: null
          };
          process.stdout.write(JSON.stringify(parseErrorResponse) + '\n');
          continue;
        }

        // Update heartbeat timestamp for any valid message
        lastHeartbeat = Date.now();

        // Validate message structure
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message format: not an object');
        }

        if (message.jsonrpc !== '2.0') {
          throw new Error('Invalid message format: missing or invalid jsonrpc version');
        }

        if (typeof message.method !== 'string') {
          throw new Error('Invalid message format: missing or invalid method');
        }

        // Handle notifications
        if (message.method.startsWith('notifications/')) {
          continue;
        }

        // Log parsed message for debugging
        mcpLog('debug', 'Parsed message:', { message });

        // Handle the message
        handleMcpMessage(message).catch(error => {
          mcpLog('error', 'Error in message handler:', error);
        });
      }
    } catch (error) {
      mcpLog('error', 'Error processing message:', { error, data: data.toString() });
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Message processing error',
          data: error instanceof Error ? error.message : String(error)
        },
        id: null
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  // Handle stdin end
  process.stdin.on('end', () => {
    mcpLog('info', 'stdin stream ended');
    cleanup();
  });

  // Handle stdin errors
  process.stdin.on('error', (error) => {
    mcpLog('error', 'stdin stream error:', error);
    cleanup();
  });

  // Keep the process running
  process.stdin.resume();
} 