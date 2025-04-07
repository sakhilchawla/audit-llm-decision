import debug from 'debug';

const mcpLogger = debug('mcp');

type LogLevel = 'info' | 'error' | 'debug' | 'warn';

export function mcpLog(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (args.length > 0) {
    mcpLogger(logMessage, ...args);
  } else {
    mcpLogger(logMessage);
  }
  
  // Also log to stderr for error level
  if (level === 'error') {
    console.error(logMessage, ...args);
  }
} 