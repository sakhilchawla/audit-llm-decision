import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'server.js');

interface McpMessage {
  jsonrpc: '2.0';
  method: string;
  params: any;
  id: number;
}

async function testMcp() {
  console.log('Starting MCP test...');
  console.log(`Server path: ${serverPath}`);
  
  // Start the server
  const server = spawn('node', [
    serverPath,
    'postgresql://postgres:postgres@localhost:5432/llm_audit?application_name=test_mcp'
  ]);

  // Log server output
  server.stdout.on('data', (data) => {
    console.log(`Server output: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`Server error: ${data}`);
  });

  // Wait for server to start
  console.log('Waiting for server to start...');
  await setTimeout(2000);

  // Test messages
  const messages: McpMessage[] = [
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
  console.log('Sending test messages...');
  for (const message of messages) {
    console.log(`Sending message: ${JSON.stringify(message)}`);
    server.stdin.write(JSON.stringify(message) + '\n');
    await setTimeout(500);
  }

  // Cleanup
  console.log('Test complete, cleaning up...');
  server.stdin.end();
  server.kill();
}

testMcp().catch(console.error); 