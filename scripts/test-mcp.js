import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testMcp() {
  // Start the server
  const server = spawn('node', [
    join(__dirname, '../dist/server.js'),
    'postgresql://postgres:postgres@localhost:5432/llm_audit?application_name=test_mcp'
  ]);

  // Wait for server to start
  await setTimeout(2000);

  // Test messages
  const messages = [
    {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {},
      id: 1
    },
    {
      jsonrpc: '2.0',
      method: 'interaction/log',
      params: {
        prompt: 'test prompt',
        response: 'test response',
        modelType: 'test-model',
        modelVersion: '1.0',
        metadata: {
          client: 'test-mcp',
          timestamp: new Date().toISOString()
        }
      },
      id: 2
    },
    {
      jsonrpc: '2.0',
      method: 'heartbeat',
      params: {},
      id: 3
    }
  ];

  // Send messages
  for (const message of messages) {
    server.stdin.write(JSON.stringify(message) + '\n');
    await setTimeout(500);
  }

  // Cleanup
  server.stdin.end();
  server.kill();
}

testMcp().catch(console.error); 