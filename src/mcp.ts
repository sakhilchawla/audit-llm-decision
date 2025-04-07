import { createInterface } from 'readline';
import { mcpLog } from './utils/logging.js';
import { pool } from './db.js';

interface McpMessage {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: number;
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

  mcpLog('info', 'Handling MCP message:', message);

  const handlers: Record<string, (params: any, id: number) => Promise<any>> = {
    'initialize': async (params, id) => ({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: '@audit-llm/server',
          version: process.env.npm_package_version || '1.0.20'
        },
        capabilities: {
          tools: true,
          resources: false,
          prompts: false
        }
      },
      id
    }),
    'tools/list': async (params, id) => ({
      jsonrpc: '2.0',
      result: {
        tools
      },
      id
    }),
    'resources/list': async (params, id) => ({
      jsonrpc: '2.0',
      result: {
        resources: []
      },
      id
    }),
    'prompts/list': async (params, id) => ({
      jsonrpc: '2.0',
      result: {
        prompts: []
      },
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
        throw error;
      }
    }
  };

  const handler = handlers[message.method];
  if (!handler) {
    throw new Error(`Unknown method: ${message.method}`);
  }

  return await handler(message.params, typeof message.id === 'number' ? message.id : 0);
}

export function handleMcpProtocol() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  mcpLog('info', 'Initializing MCP protocol handler via stdin/stdout');

  rl.on('line', async (line) => {
    let parsedMessage: McpMessage | undefined;
    
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === 'object' && parsed !== null) {
        parsedMessage = parsed as McpMessage;
        mcpLog('info', 'Received MCP message:', parsedMessage);

        if (!parsedMessage.jsonrpc || parsedMessage.jsonrpc !== '2.0' || !parsedMessage.method) {
          throw new Error('Invalid JSON-RPC message');
        }

        const response = await handleMcpMessage(parsedMessage);
        if (response) {
          mcpLog('info', 'Sending MCP response:', response);
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } else {
        throw new Error('Invalid message format');
      }
    } catch (error) {
      mcpLog('error', 'Error handling MCP message:', error instanceof Error ? error.message : String(error));
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Internal error'
        },
        id: parsedMessage?.id ?? null
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  rl.on('close', () => {
    mcpLog('info', 'MCP connection closed');
    process.exit(0);
  });
} 