import { spawn } from 'child_process';
import fetch from 'node-fetch';
import assert from 'assert';

// Test configuration
const config = {
  connectionString: 'postgresql://postgres:postgres@localhost:5432/audit_llm',
  httpPort: 4001,
  mcpPort: 4002,
  claudePort: 4003
};

// Utility to wait for a port to be available
const waitForServer = async (port, retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        console.log(`✅ Server is ready on port ${port}`);
        return true;
      }
    } catch (e) {
      console.log(`Waiting for server on port ${port}... (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server failed to start on port ${port}`);
};

// Test HTTP mode
const testHttp = async () => {
  console.log('\n🔍 Testing HTTP mode...');
  
  // Start server in HTTP mode
  const server = spawn('node', [
    'dist/server.js',
    config.connectionString,
    config.httpPort.toString()
  ]);

  // Log server output for debugging
  server.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });
  
  try {
    // Wait for server to start
    await waitForServer(config.httpPort);
    
    // Test health endpoint
    const health = await fetch(`http://localhost:${config.httpPort}/health`);
    assert.strictEqual(health.status, 200);
    console.log('✅ Health check passed');
    
    // Test interaction logging
    const logResponse = await fetch(`http://localhost:${config.httpPort}/api/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Test prompt',
        response: 'Test response',
        modelType: 'test-model',
        modelVersion: '1.0',
        metadata: { test: true }
      })
    });

    if (!logResponse.ok) {
      const text = await logResponse.text();
      throw new Error(`Request failed: ${logResponse.status} ${text}`);
    }
    
    const logResult = await logResponse.json();
    assert(logResult.success);
    assert(logResult.id > 0);
    console.log('✅ Interaction logging passed');
    
  } catch (error) {
    console.error('❌ HTTP test failed:', error);
    throw error;
  } finally {
    server.kill();
  }
};

// Test MCP mode
const testMcp = async () => {
  console.log('\n🔍 Testing MCP mode...');
  
  // Start server in MCP mode
  const server = spawn('node', [
    'dist/server.js',
    config.connectionString,
    config.mcpPort.toString(),
    '--mcp'
  ]);

  // Log server output for debugging
  server.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });
  
  try {
    // Wait for server to start
    await waitForServer(config.mcpPort);
    
    // Test MCP protocol
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
    
    // Send messages and collect responses
    for (const msg of messages) {
      server.stdin.write(JSON.stringify(msg) + '\n');
    }
    
    // Wait for responses
    let buffer = '';
    const responses = [];
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MCP test timeout')), 5000);
      
      server.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            if (response.id !== undefined) {
              responses.push(response);
              if (responses.length === messages.length) {
                clearTimeout(timeout);
                resolve();
              }
            }
          } catch (e) {
            // Ignore non-JSON lines (logs)
          }
        }
      });
    });
    
    // Verify responses
    assert(responses.length === messages.length);
    assert(responses.every(r => r.jsonrpc === '2.0'));
    assert(responses.every(r => !r.error));
    console.log('✅ MCP protocol test passed');
    
  } catch (error) {
    console.error('❌ MCP test failed:', error);
    throw error;
  } finally {
    server.kill();
  }
};

// Test Claude mode
const testClaude = async () => {
  console.log('\n🔍 Testing Claude mode...');
  
  // Start server in HTTP mode (Claude uses HTTP)
  const server = spawn('node', [
    'dist/server.js',
    config.connectionString,
    config.claudePort.toString()
  ]);

  // Log server output for debugging
  server.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });
  
  try {
    // Wait for server to start
    await waitForServer(config.claudePort);
    
    // Test Claude-specific interaction logging
    const logResponse = await fetch(`http://localhost:${config.claudePort}/api/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Test Claude prompt',
        response: 'Test Claude response',
        modelType: 'claude-3-opus',
        modelVersion: '20240229',
        metadata: {
          conversation_id: 'test-conv-id',
          system_prompt: 'You are Claude',
          temperature: 0.7
        }
      })
    });

    if (!logResponse.ok) {
      const text = await logResponse.text();
      throw new Error(`Request failed: ${logResponse.status} ${text}`);
    }
    
    const logResult = await logResponse.json();
    assert(logResult.success);
    assert(logResult.id > 0);
    console.log('✅ Claude interaction logging passed');
    
  } catch (error) {
    console.error('❌ Claude test failed:', error);
    throw error;
  } finally {
    server.kill();
  }
};

// Run all tests
const runTests = async () => {
  try {
    console.log('🚀 Starting comprehensive tests...\n');
    
    await testHttp();
    await testMcp();
    await testClaude();
    
    console.log('\n✨ All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
};

runTests(); 