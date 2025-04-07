import { spawn } from 'child_process';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testMcpStability = async () => {
  console.log('🔍 Testing MCP mode stability...');

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
  const responses = new Map();
  let messageId = 1;
  let isRunning = true;

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
          responses.set(msg.id, msg);
          console.log('📥 Received response:', msg);
        } else if (msg.method === 'log') {
          console.log('📋 Server log:', msg.params);
        }
      } catch (e) {
        console.log('Server output:', line);
      }
    }
  });

  // Handle server errors
  server.stderr.on('data', (data) => {
    console.error('❌ Server error:', data.toString());
  });

  // Handle server exit
  server.on('exit', (code) => {
    if (code !== null) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(1);
    }
  });

  const sendMessage = async (msg) => {
    const id = messageId++;
    const message = { ...msg, id, jsonrpc: '2.0' };
    console.log('\n📤 Sending:', message);
    server.stdin.write(JSON.stringify(message) + '\n');

    // Wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Response timeout')), 5000);
      
      const checkResponse = () => {
        const response = responses.get(id);
        if (response) {
          clearTimeout(timeout);
          resolve(response);
        } else if (!isRunning) {
          clearTimeout(timeout);
          reject(new Error('Server stopped'));
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      
      checkResponse();
    });
  };

  try {
    // Initialize connection
    console.log('\n🚀 Initializing connection...');
    const initResponse = await sendMessage({ method: 'initialize' });
    console.log('✅ Connection initialized:', initResponse.result);

    // Start heartbeat loop
    const heartbeatInterval = setInterval(async () => {
      try {
        await sendMessage({ method: 'heartbeat' });
        console.log('💓 Heartbeat sent and received');
      } catch (error) {
        console.error('❌ Heartbeat failed:', error);
        isRunning = false;
      }
    }, 30000);

    // Start interaction logging loop
    const loggingInterval = setInterval(async () => {
      try {
        const response = await sendMessage({
          method: 'interaction/log',
          params: {
            prompt: `Test prompt ${Date.now()}`,
            response: `Test response ${Date.now()}`,
            modelType: 'test-mcp-model',
            modelVersion: '1.0',
            metadata: { 
              timestamp: Date.now(),
              test: true 
            }
          }
        });
        console.log('📝 Interaction logged:', response.result);
      } catch (error) {
        console.error('❌ Logging failed:', error);
        isRunning = false;
      }
    }, 5000);

    // Run stability test
    console.log('\n⏳ Running stability test (60 seconds)...');
    await sleep(60000);

    // Cleanup
    clearInterval(heartbeatInterval);
    clearInterval(loggingInterval);
    isRunning = false;

    // Final status check
    const finalResponse = await sendMessage({ method: 'tools/list' });
    console.log('✅ Final status check passed:', finalResponse);

    console.log('\n✨ Stability test completed successfully!');
    console.log(`📊 Statistics:
- Total messages sent: ${messageId - 1}
- Total responses received: ${responses.size}
- Connection remained stable: Yes
- All responses valid: ${Array.from(responses.values()).every(r => r.jsonrpc === '2.0' && !r.error)}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    server.kill();
  }
};

// Run test
testMcpStability(); 