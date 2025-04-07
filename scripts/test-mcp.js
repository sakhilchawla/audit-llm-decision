import { spawn } from 'child_process';
import { createInterface } from 'readline';

async function runTest() {
  const server = spawn('node', [
    '-r',
    'dotenv/config',
    '--experimental-specifier-resolution=node',
    'dist/src/server.js',
    '--mcp'
  ], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = createInterface({
    input: server.stdout,
    crlfDelay: Infinity
  });

  const messages = [
    {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1
    },
    {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2
    },
    {
      jsonrpc: '2.0',
      method: 'resources/list',
      id: 3
    },
    {
      jsonrpc: '2.0',
      method: 'prompts/list',
      id: 4
    },
    {
      jsonrpc: '2.0',
      method: 'interaction/log',
      id: 5,
      params: {
        prompt: 'test prompt',
        response: 'test response',
        modelType: 'claude-3-opus',
        modelVersion: '1.0',
        metadata: { test: true }
      }
    },
    {
      jsonrpc: '2.0',
      method: 'heartbeat',
      id: 6
    }
  ];

  let currentMessageIndex = 0;
  let receivedResponses = 0;

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id) {
        console.log(`✓ Received response for ${messages[response.id - 1].method}`);
        receivedResponses++;
        
        if (receivedResponses === messages.length) {
          console.log('\nAll tests passed successfully!');
          server.kill();
          process.exit(0);
        }
      }
    } catch (error) {
      console.error('Error parsing response:', error);
    }
  });

  // Send messages with a small delay between them
  for (const message of messages) {
    server.stdin.write(JSON.stringify(message) + '\n');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

runTest().catch(console.error); 