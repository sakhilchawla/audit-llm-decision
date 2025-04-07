import { spawn } from 'child_process';

const testMcp = async () => {
  console.log('🔍 Testing MCP mode...');

  const server = spawn('node', [
    'dist/server.js',
    'postgresql://postgres:postgres@localhost:5432/audit_llm',
    '4002',
    '--mcp'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Buffer for collecting responses
  let buffer = '';
  const responses = [];

  // Handle server output
  server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined) {
          responses.push(msg);
          console.log('Received response:', msg);
        } else if (msg.method === 'log') {
          console.log('Server log:', msg.params);
        }
      } catch (e) {
        console.log('Server output:', line);
      }
    }
  });

  // Handle server errors
  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Test messages
  const messages = [
    { jsonrpc: '2.0', method: 'initialize', id: 1 },
    { jsonrpc: '2.0', method: 'tools/list', id: 2 },
    { jsonrpc: '2.0', method: 'interaction/log', id: 3, params: {
      prompt: 'Test MCP prompt',
      response: 'Test MCP response',
      modelType: 'test-mcp-model',
      modelVersion: '1.0',
      metadata: { test: true }
    }},
    { jsonrpc: '2.0', method: 'heartbeat', id: 4 }
  ];

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send test messages
    console.log('\nSending test messages...');
    for (const msg of messages) {
      console.log('\nSending:', msg);
      server.stdin.write(JSON.stringify(msg) + '\n');
      
      // Wait for response
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Response timeout')), 5000);
        
        const checkResponse = () => {
          const response = responses.find(r => r.id === msg.id);
          if (response) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkResponse, 100);
          }
        };
        
        checkResponse();
      });
    }

    console.log('\n✅ All messages sent and responses received');
    console.log('\nResponses:', responses);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    server.kill();
  }
};

// Run test
testMcp(); 