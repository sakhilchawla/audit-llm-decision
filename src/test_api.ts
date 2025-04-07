import fetch from 'node-fetch';

async function testLoggingAPI() {
  const testInteraction = {
    prompt: "Can we bypass MCP and test the service manually?",
    response: "Yes, we can test the service directly using the HTTP API endpoint...",
    modelType: "claude",
    modelVersion: "3.5-sonnet",
    metadata: {
      client: "direct-test",
      timestamp: new Date().toISOString(),
      test: true
    }
  };

  try {
    console.log('Sending test interaction...');
    const response = await fetch('http://localhost:4001/api/v1/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testInteraction)
    });

    const result = await response.json();
    console.log('Response:', result);

    // Now fetch recent logs
    console.log('\nFetching recent logs...');
    const logsResponse = await fetch('http://localhost:4001/api/v1/logs?limit=5');
    const logs = await logsResponse.json();
    console.log('Recent logs:', JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoggingAPI(); 