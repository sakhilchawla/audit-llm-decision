import { spawn } from 'child_process';
import fetch from 'node-fetch';
import pg from 'pg';

// Configuration
const config = {
  server: {
    port: 4000,
    connectionString: 'postgresql://postgres:postgres@localhost:5432/audit_llm'
  },
  db: {
    connectionString: 'postgresql://postgres:postgres@localhost:5432/audit_llm'
  }
};

// Create a database client
const dbClient = new pg.Client(config.db);

// Wait for server to be ready
const waitForServer = async (port, retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        console.log('✅ Server is ready');
        return true;
      }
    } catch (e) {
      console.log(`Waiting for server... (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server failed to start');
};

// Test server and database
const testServerAndDb = async () => {
  console.log('🚀 Starting server and database test...\n');

  // Connect to database
  try {
    await dbClient.connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Start server
  const server = spawn('node', [
    'dist/server.js',
    config.server.connectionString,
    config.server.port.toString()
  ]);

  // Log server output for debugging
  server.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });

  try {
    // Wait for server to be ready
    await waitForServer(config.server.port);

    // Test cases
    const testCases = [
      {
        name: 'HTTP API Test',
        request: {
          url: `http://localhost:${config.server.port}/api/interactions`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            prompt: 'Test HTTP prompt',
            response: 'Test HTTP response',
            modelType: 'test-model',
            modelVersion: '1.0',
            metadata: { test: true }
          }
        }
      },
      {
        name: 'Claude Integration Test',
        request: {
          url: `http://localhost:${config.server.port}/api/interactions`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            prompt: 'Test Claude prompt',
            response: 'Test Claude response',
            modelType: 'claude-3-opus',
            modelVersion: '20240229',
            metadata: {
              conversation_id: 'test-123',
              temperature: 0.7
            }
          }
        }
      }
    ];

    // Run test cases
    for (const testCase of testCases) {
      console.log(`\n🔍 Running ${testCase.name}...`);

      // Make request
      const response = await fetch(testCase.request.url, {
        method: testCase.request.method,
        headers: testCase.request.headers,
        body: JSON.stringify(testCase.request.body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request failed: ${response.status} ${text}`);
      }

      const result = await response.json();
      console.log('Response:', result);

      // Verify record in database
      const dbRecord = await dbClient.query(
        'SELECT * FROM interactions WHERE id = $1',
        [result.id]
      );

      if (dbRecord.rows.length === 1) {
        const record = dbRecord.rows[0];
        console.log('✅ Database record found:', {
          id: record.id,
          model_type: record.model_type,
          model_version: record.model_version,
          created_at: record.created_at
        });

        // Verify record matches request
        if (
          record.model_type === testCase.request.body.modelType &&
          record.model_version === testCase.request.body.modelVersion &&
          record.prompt === testCase.request.body.prompt &&
          record.response === testCase.request.body.response
        ) {
          console.log('✅ Record data matches request');
        } else {
          throw new Error('Record data does not match request');
        }
      } else {
        throw new Error('Record not found in database');
      }
    }

    // Test querying records
    console.log('\n🔍 Testing record retrieval...');
    const allRecords = await dbClient.query(
      'SELECT COUNT(*) as count FROM interactions'
    );
    console.log(`✅ Total records in database: ${allRecords.rows[0].count}`);

    console.log('\n✨ All tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    server.kill();
    await dbClient.end();
  }
};

// Run tests
testServerAndDb(); 