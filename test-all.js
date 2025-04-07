import { spawn } from 'child_process';

async function runTest(script) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${script}...`);
    const test = spawn('node', [
      '-r',
      'dotenv/config',
      '--experimental-specifier-resolution=node',
      script
    ], {
      stdio: 'inherit'
    });

    test.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${script} failed with code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  try {
    console.log('Starting comprehensive tests...');
    
    // Run MCP tests
    console.log('\n=== Testing Claude Desktop MCP ===');
    await runTest('scripts/test-mcp.js');
    
    // Run HTTP tests
    console.log('\n=== Testing HTTP Mode ===');
    await runTest('scripts/test-http.js');
    
    console.log('\nAll tests completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('\nTest suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests(); 