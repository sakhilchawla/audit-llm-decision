import nodeFetch from 'node-fetch';
import { Response } from 'node-fetch';

async function testModelLogging() {
  const baseUrl = 'http://localhost:4000';

  // Helper function to log interaction
  async function logInteraction(data: any) {
    const response = await nodeFetch(`${baseUrl}/api/v1/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  }

  try {
    // Test with Claude
    console.log('\nTesting Claude logging:');
    const claudeResult = await logInteraction({
      prompt: "What is quantum computing?",
      response: "Quantum computing is a type of computing that uses quantum phenomena...",
      modelType: "claude",
      modelVersion: "3.5-sonnet",
      metadata: {
        client: "test-script",
        timestamp: new Date().toISOString()
      }
    });
    console.log('Claude log result:', claudeResult);

    // Test with GPT-4
    console.log('\nTesting GPT-4 logging:');
    const gptResult = await logInteraction({
      prompt: "Explain machine learning",
      response: "Machine learning is a subset of artificial intelligence...",
      modelType: "gpt",
      modelVersion: "4",
      metadata: {
        client: "test-script",
        temperature: 0.7,
        timestamp: new Date().toISOString()
      }
    });
    console.log('GPT-4 log result:', gptResult);

    // Test with Llama
    console.log('\nTesting Llama logging:');
    const llamaResult = await logInteraction({
      prompt: "What are neural networks?",
      response: "Neural networks are computing systems inspired by biological neural networks...",
      modelType: "llama",
      modelVersion: "2-70b",
      metadata: {
        client: "test-script",
        context_length: 4096,
        timestamp: new Date().toISOString()
      }
    });
    console.log('Llama log result:', llamaResult);

    // Fetch and display logs
    console.log('\nFetching recent logs:');
    const logsResponse = await nodeFetch(`${baseUrl}/api/v1/logs?limit=5`);
    const logs = await logsResponse.json();
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testModelLogging(); 