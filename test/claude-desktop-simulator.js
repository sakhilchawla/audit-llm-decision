import { spawn } from 'child_process';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ClaudeDesktopSimulator {
  constructor() {
    this.messageId = 1;
    this.responses = new Map();
    this.buffer = '';
    this.isConnected = false;
    this.conversationId = `conv_${Date.now()}`;
    this.serverReady = false;
    this.serverStarted = false;
  }

  async start() {
    console.log('🚀 Starting Claude Desktop Simulator...');

    return new Promise((resolve, reject) => {
      let initializationAttempted = false;

      // Start the server
      this.server = spawn('node', [
        'dist/server.js',
        'postgresql://postgres:postgres@localhost:5432/audit_llm',
        '4002',
        '--mcp'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle server output
      this.server.stdout.on('data', async (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id !== undefined) {
              this.responses.set(msg.id, msg);
              console.log('📥 Server:', msg);
              
              // Check for successful initialization
              if (msg.id === 1 && msg.result && msg.result.protocolVersion) {
                this.isConnected = true;
                resolve();
              }
            } else if (msg.method === 'log') {
              console.log('📋 Server log:', msg.params);
              // Check for server ready message
              if (msg.params.message && msg.params.message.includes('Starting MCP server')) {
                this.serverReady = true;
                if (!initializationAttempted) {
                  initializationAttempted = true;
                  await sleep(1000); // Give server time to fully start
                  await this.initializeConnection().catch(reject);
                }
              }
            }
          } catch (e) {
            console.log('Server output:', line);
          }
        }
      });

      // Handle server errors
      this.server.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('❌ Server error:', error);
        if (error.includes('EADDRINUSE')) {
          reject(new Error('Port 4002 is already in use. Please stop any existing server instances.'));
        } else {
          reject(new Error(`Server error: ${error}`));
        }
      });

      // Handle server exit
      this.server.on('exit', (code) => {
        if (!this.isConnected) {
          reject(new Error(`Server exited with code ${code} before connection was established`));
        }
      });

      // Set timeout for server start
      setTimeout(() => {
        if (!this.serverReady) {
          reject(new Error('Server failed to start within timeout'));
        }
      }, 10000);
    });
  }

  async initializeConnection() {
    try {
      console.log('\n🤖 Initializing Claude Desktop connection...');
      const response = await this.sendMessage({ method: 'initialize' });
      if (!response || !response.result || !response.result.protocolVersion) {
        throw new Error('Invalid initialization response');
      }
      this.serverStarted = true;
      console.log('✅ Connection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize connection:', error);
      throw error;
    }
  }

  async sendMessage(msg) {
    if (!this.serverReady) {
      throw new Error('Server not ready');
    }

    const id = this.messageId++;
    const message = { ...msg, id, jsonrpc: '2.0' };
    console.log('\n📤 Claude Desktop:', message);
    
    try {
      this.server.stdin.write(JSON.stringify(message) + '\n');
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responses.delete(id);
        reject(new Error('Response timeout'));
      }, 5000);
      
      const checkResponse = () => {
        const response = this.responses.get(id);
        if (response) {
          this.responses.delete(id);
          clearTimeout(timeout);
          if (response.error) {
            reject(new Error(response.error.message || 'Unknown error'));
          } else {
            resolve(response);
          }
        } else if (!this.serverReady) {
          clearTimeout(timeout);
          reject(new Error('Server not ready'));
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      
      checkResponse();
    });
  }

  async simulateConversation(prompts) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    console.log('\n💭 Starting conversation simulation...');
    
    // Start heartbeat
    const heartbeatInterval = setInterval(async () => {
      try {
        await this.sendMessage({ method: 'heartbeat' });
        console.log('💓 Heartbeat maintained');
      } catch (error) {
        console.error('❌ Heartbeat failed:', error);
        this.isConnected = false;
      }
    }, 30000);
    
    try {
      for (const prompt of prompts) {
        console.log('\n👤 User:', prompt);
        
        // Simulate Claude thinking
        console.log('🤔 Claude is thinking...');
        await sleep(Math.random() * 2000 + 1000);
        
        // Generate Claude's response
        const response = `This is Claude's simulated response to: "${prompt}". Generated at ${new Date().toISOString()}`;
        console.log('🤖 Claude:', response);

        // Log the interaction
        await this.sendMessage({
          method: 'interaction/log',
          params: {
            prompt,
            response,
            modelType: 'claude-3-opus',
            modelVersion: '20240229',
            metadata: {
              conversation_id: this.conversationId,
              timestamp: Date.now(),
              system_prompt: 'You are Claude, a helpful AI assistant.',
              temperature: 0.7,
              client: 'claude-desktop'
            }
          }
        });
        
        // Simulate natural conversation delay
        await sleep(Math.random() * 1000 + 500);
      }
    } finally {
      clearInterval(heartbeatInterval);
    }
  }

  async stop() {
    console.log('\n👋 Ending Claude Desktop session...');
    this.isConnected = false;
    this.serverReady = false;
    this.server.kill();
    console.log('✨ Session ended successfully');
  }
}

// Run the simulator
const runSimulation = async () => {
  const simulator = new ClaudeDesktopSimulator();
  
  try {
    await simulator.start();

    // Sample conversation
    const prompts = [
      "Hello Claude! How are you today?",
      "Can you explain what quantum computing is?",
      "What's the difference between classical and quantum bits?",
      "That's interesting! Can you give me a practical example?",
      "Thank you for explaining. One last question - what companies are leading in quantum computing?"
    ];

    await simulator.simulateConversation(prompts);
    
    // Final verification
    console.log('\n📊 Simulation statistics:');
    console.log(`- Messages sent: ${simulator.messageId - 1}`);
    console.log(`- Responses received: ${simulator.responses.size}`);
    console.log(`- Conversation ID: ${simulator.conversationId}`);
    console.log(`- All messages successful: ${Array.from(simulator.responses.values()).every(r => !r.error)}`);

  } catch (error) {
    console.error('\n❌ Simulation failed:', error);
    process.exit(1);
  } finally {
    await simulator.stop();
  }
};

runSimulation(); 