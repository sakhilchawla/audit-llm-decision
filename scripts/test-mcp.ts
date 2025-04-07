import { spawn } from 'child_process';
import { createInterface } from 'readline';
import type { ChildProcessWithoutNullStreams } from 'child_process';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('Starting MCP protocol test...');

  const server = spawn('node', [
    '-r',
    'dotenv/config',
    '--experimental-specifier-resolution=node',
    'dist/src/server.js',
    '--mcp'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  }) as ChildProcessWithoutNullStreams;

  const rl = createInterface({
    input: server.stdout,
    output: process.stdout,
    terminal: false
  });

  let responses: string[] = [];
  rl.on('line', (line) => {
    responses.push(line);
  });

  // Helper function to send message and wait for response
  async function sendMessage(message: any): Promise<any> {
    const startLength = responses.length;
    server.stdin.write(JSON.stringify(message) + '\n');
    
    // Wait for response
    while (responses.length === startLength) {
      await delay(100);
    }
    
    const response = responses[responses.length - 1];
    return JSON.parse(response);
  }

  try {
    // Test 1: Initialize
    console.log('\nTesting initialize...');
    const initResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {},
      id: 1
    });
    console.assert(initResult.result.protocolVersion === '2024-11-05', 'Protocol version mismatch');
    console.assert(initResult.result.serverInfo.name === '@audit-llm/server', 'Server name mismatch');
    console.log('✓ Initialize test passed');

    // Test 2: Tools list
    console.log('\nTesting tools/list...');
    const toolsResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2
    });
    console.assert(toolsResult.result.tools.length > 0, 'No tools returned');
    console.assert(toolsResult.result.tools[0].name === 'interaction/log', 'Expected interaction/log tool');
    console.log('✓ Tools list test passed');

    // Test 3: Resources list
    console.log('\nTesting resources/list...');
    const resourcesResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'resources/list',
      params: {},
      id: 3
    });
    console.assert(Array.isArray(resourcesResult.result.resources), 'Resources not an array');
    console.log('✓ Resources list test passed');

    // Test 4: Prompts list
    console.log('\nTesting prompts/list...');
    const promptsResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'prompts/list',
      params: {},
      id: 4
    });
    console.assert(Array.isArray(promptsResult.result.prompts), 'Prompts not an array');
    console.log('✓ Prompts list test passed');

    // Test 5: Heartbeat
    console.log('\nTesting heartbeat...');
    const heartbeatResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'heartbeat',
      params: {},
      id: 5
    });
    console.assert(heartbeatResult.result === null, 'Heartbeat response should be null');
    console.log('✓ Heartbeat test passed');

    // Test 6: Interaction log
    console.log('\nTesting interaction/log...');
    const interactionResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'interaction/log',
      params: {
        prompt: 'test prompt',
        response: 'test response',
        modelType: 'claude-3-opus',
        modelVersion: '1.0',
        metadata: {
          test: true
        }
      },
      id: 6
    });
    console.assert(interactionResult.result.id, 'No interaction ID returned');
    console.assert(interactionResult.result.created_at, 'No creation timestamp returned');
    console.log('✓ Interaction log test passed');

    // Test 7: Invalid method
    console.log('\nTesting invalid method...');
    const invalidResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'invalid_method',
      params: {},
      id: 7
    });
    console.assert(invalidResult.error.code === -32601, 'Wrong error code for invalid method');
    console.log('✓ Invalid method test passed');

    console.log('\nAll tests passed! 🎉');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    server.stdin.end();
    await delay(1000); // Give server time to clean up
    server.kill();
  }
}

runTest(); 