import { startServer } from '../src/server';

// Start the server in test mode
startServer()
  .then(() => {
    console.log('Test server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start test server:', error);
    process.exit(1);
  }); 