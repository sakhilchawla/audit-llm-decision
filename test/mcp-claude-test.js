import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exact messages from Claude Desktop logs
const testMessages = [
  {
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'claude-ai',
        version: '0.1.0'
      }
    },
    jsonrpc: '2.0',
    id: 0
  },
  {
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1
  },
  {
    jsonrpc: '2.0',
    method: 'resources/list',
    id: 2
  },
  {
    jsonrpc: '2.0',
    method: 'prompts/list',
    id: 3
  },
  {
    jsonrpc: '2.0',
    method: 'interaction/log',
    id: 4,
    params: {
      prompt: 'Test prompt from Claude Desktop',
      response: 'Test response',
      modelType: 'claude-3-opus',
      modelVersion: '1.0',
      metadata: {
        source: 'claude-desktop-test'
      }
    }
  }
];

// Start the MCP server
console.log('Starting MCP server...');
const server = spawn('node', [
  '-r', 'dotenv/config',
  '--experimental-specifier-resolution=node',
  path.join(__dirname, '../dist/src/server.js'),
  '--mcp'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageIndex = 0;
let receivedResponses = 0;
let hasError = false;

// Handle server stdout
const rl = createInterface({
  input: server.stdout,
  terminal: false,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    // Skip empty lines
    if (!line.trim()) return;

    console.log('Received:', line);
    const response = JSON.parse(line);

    // Validate response format
    if (!response.jsonrpc || response.jsonrpc !== '2.0') {
      console.error('Invalid response format - missing or invalid jsonrpc version');
      hasError = true;
      return;
    }

    // Count valid responses
    if (response.result || response.error) {
      receivedResponses++;
    }

    // Check if we've received responses for all messages
    if (receivedResponses === testMessages.length) {
      console.log('All messages processed successfully');
      cleanup();
    }
  } catch (error) {
    console.error('Error parsing server response:', error);
    hasError = true;
  }
});

// Handle server stderr
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
  hasError = true;
});

// Send test messages with delay
function sendNextMessage() {
  if (messageIndex < testMessages.length) {
    const message = testMessages[messageIndex++];
    console.log('Sending:', JSON.stringify(message));
    server.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(sendNextMessage, 1000);
  }
}

// Start sending messages after a short delay
setTimeout(sendNextMessage, 1000);

// Handle cleanup
function cleanup() {
  console.log('Test completed. Errors:', hasError ? 'Yes' : 'No');
  server.stdin.end();
  process.exit(hasError ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Set a timeout to prevent hanging
setTimeout(() => {
  console.error('Test timeout - not all responses received');
  cleanup();
}, 30000); 