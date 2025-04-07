import { spawn } from 'child_process';

// Test messages
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
      prompt: 'Test prompt',
      response: 'Test response',
      modelType: 'claude-3-opus',
      modelVersion: '1.0',
      metadata: {
        source: 'test',
        test: true
      }
    }
  },
  {
    jsonrpc: '2.0',
    method: 'heartbeat',
    id: 6
  }
];

// Start the server process
const server = spawn('node', [
  '-r',
  'dotenv/config',
  '--experimental-specifier-resolution=node',
  'dist/src/server.js',
  'postgresql://postgres:postgres@localhost:5432/llm_audit?application_name=claude_desktop',
  '4001',
  '--mcp'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (!line) continue;
    
    // Only try to parse lines that look like JSON
    if (line.trim().startsWith('{')) {
      try {
        const message = JSON.parse(line);
        console.log('Received JSON:', message);
      } catch (error) {
        console.error('Error parsing JSON message:', error);
      }
    } else {
      console.log('Server output:', line);
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Send test messages with delay
let messageIndex = 0;
const sendNextMessage = () => {
  if (messageIndex < messages.length) {
    const message = messages[messageIndex++];
    console.log('Sending:', message);
    server.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(sendNextMessage, 1000);
  } else {
    setTimeout(() => {
      console.log('Tests completed, shutting down...');
      server.stdin.end();
      process.exit(0);
    }, 1000);
  }
};

// Start sending messages after a short delay
setTimeout(sendNextMessage, 1000);

// Handle cleanup
process.on('SIGINT', () => {
  server.stdin.end();
  process.exit();
}); 