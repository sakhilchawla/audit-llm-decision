import debug from 'debug';

const mcpLogger = debug('mcp');

type LogLevel = 'info' | 'error' | 'debug' | 'warn';

export function mcpLog(level: LogLevel, message: string, data?: any) {
  const isMcpMode = process.argv.includes('--mcp');
  const timestamp = new Date().toISOString();

  if (isMcpMode) {
    // MCP mode: Use stderr for logging
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    console.error(`[${timestamp}] ${level.toUpperCase()}: ${message}${logData}`);
  } else {
    // HTTP mode: Regular logging
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${logData}`);
  }
} 