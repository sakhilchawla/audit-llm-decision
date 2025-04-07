import http from 'http';

async function runHttpTest() {
  // Test health endpoint
  const healthCheck = () => {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:4000/health', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log('✓ Health check passed');
          resolve(data);
        });
      }).on('error', reject);
    });
  };

  // Test interaction logging
  const logInteraction = () => {
    return new Promise((resolve, reject) => {
      const req = http.request('http://localhost:4000/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✓ Interaction logging passed');
            resolve(data);
          } else {
            reject(new Error(`Failed with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      
      req.write(JSON.stringify({
        prompt: 'test prompt',
        response: 'test response',
        modelType: 'claude-3-opus',
        modelVersion: '1.0',
        metadata: { test: true }
      }));
      
      req.end();
    });
  };

  try {
    // Start the server
    const server = await import('../dist/src/server.js');
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run tests
    await healthCheck();
    await logInteraction();
    
    console.log('\nAll HTTP tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runHttpTest(); 