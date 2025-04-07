import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial messages to test
const initialMessages = [
  { jsonrpc: '2.0', method: 'initialize', id: 1 },
  { jsonrpc: '2.0', method: 'tools/list', id: 2 },
  { jsonrpc: '2.0', method: 'resources/list', id: 3 },
  { jsonrpc: '2.0', method: 'prompts/list', id: 4 }
];

// Periodic messages to simulate Cursor Desktop behavior
const periodicMessages = [
  { jsonrpc: '2.0', method: 'heartbeat', id: 5 },
  { jsonrpc: '2.0', method: 'resources/list', id: 6 },
  { jsonrpc: '2.0', method: 'prompts/list', id: 7 }
];

// Example interaction log
const interactionMessage = {
  jsonrpc: '2.0',
  method: 'interaction/log',
  id: 8,
  params: {
    prompt: 'How do I implement a binary search tree?',
    response: 'Here is an implementation of a binary search tree...',
    modelType: 'claude-3-opus',
    modelVersion: '1.0',
    metadata: { source: 'cursor-desktop', test: true }
  }
};

// Start the MCP server
const server = spawn('node', [
  '-r', 'dotenv/config',
  '--experimental-specifier-resolution=node',
  path.join(__dirname, '../dist/src/server.js'),
  '--mcp'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString().trim());
});

// Send initial messages
let messageIndex = 0;
const sendInitialMessages = () => {
  if (messageIndex < initialMessages.length) {
    const message = initialMessages[messageIndex++];
    console.log('Sending:', JSON.stringify(message));
    server.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(sendInitialMessages, 1000);
  } else {
    // Start periodic messages after initial sequence
    startPeriodicMessages();
    // Send an interaction log after 10 seconds
    setTimeout(() => {
      console.log('Sending interaction:', JSON.stringify(interactionMessage));
      server.stdin.write(JSON.stringify(interactionMessage) + '\n');
    }, 10000);
  }
};

// Simulate periodic requests like Cursor Desktop
const startPeriodicMessages = () => {
  let periodicIndex = 0;
  const interval = setInterval(() => {
    const message = periodicMessages[periodicIndex++ % periodicMessages.length];
    const newId = message.id + Math.floor(periodicIndex / periodicMessages.length) * 10;
    const periodicMessage = { ...message, id: newId };
    console.log('Sending periodic:', JSON.stringify(periodicMessage));
    server.stdin.write(JSON.stringify(periodicMessage) + '\n');
  }, 5000); // Send periodic messages every 5 seconds

  // Keep the connection alive for 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('Test complete, closing connection...');
    server.stdin.end();
  }, 30000);
};

// Start sending messages after server startup
setTimeout(sendInitialMessages, 1000);

// Handle cleanup
process.on('SIGINT', () => {
  server.stdin.end();
  process.exit();
}); 