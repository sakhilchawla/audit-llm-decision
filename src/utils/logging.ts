import debug from 'debug';

const mcpLogger = debug('mcp');

type LogLevel = 'info' | 'error' | 'debug' | 'warn';

export function mcpLog(level: LogLevel, message: string, data?: any) {
  const isMcpMode = process.argv.includes('--mcp');

  if (isMcpMode) {
    // MCP mode: JSON-RPC format
    const logMessage = {
      jsonrpc: '2.0',
      method: 'log',
      params: {
        level,
        message,
        ...(data && { data })
      }
    };
    console.log(JSON.stringify(logMessage));
  } else {
    // HTTP mode: Regular logging
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${logData}`);
  }
} 