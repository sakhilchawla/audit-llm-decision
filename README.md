# Audit LLM Decisions Server

A Model Context Protocol (MCP) server for auditing and logging LLM interactions. This server provides a standardized way to track, analyze, and audit AI model decisions and interactions.

## Features

- Log LLM interactions with detailed context
- Track decision paths and reasoning
- Store model inferences and confidence scores
- MCP-compliant API endpoints
- PostgreSQL persistence
- Rate limiting and security features
- Support for multiple deployment methods
- Comprehensive error handling

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Docker (optional)

### Installation Methods

#### 1. NPX Installation (Recommended for MCP usage)

Run directly without installation:
```bash
# Default port 4000
npx @audit-llm/server postgresql://user:password@host:5432/llm_audit

# Custom port
npx @audit-llm/server postgresql://user:password@host:5432/llm_audit 4001
```

#### 2. Global Installation

```bash
# Install globally
npm install -g @audit-llm/server

# Run server
audit-llm-server postgresql://user:password@host:5432/llm_audit [port]
```

#### 3. Docker Installation

```bash
# Build the image
docker build -t audit-llm/server .

# Run the container
docker run -i --rm -p 4000:4000 audit-llm/server postgresql://user:password@host:5432/llm_audit
```

## Claude Desktop Integration

### 1. Create Configuration File

Create or edit `claude_desktop_config.json`:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration

```json
{
  "mcpServers": {
    "audit-llm": {
      "command": "npx",
      "args": [
        "@audit-llm/server",
        "postgresql://postgres:password@localhost:5432/llm_audit"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Verify Database Setup

```bash
# Create database if not exists
createdb llm_audit

# Test connection
psql -h localhost -U postgres -d llm_audit
```

### 4. Restart Claude Desktop

After configuring, restart Claude Desktop to apply changes.

### 5. Verify Integration

1. Open Claude Desktop
2. Check console for server startup messages
3. Make a test query - you should see interaction logs in your database

## Cursor Integration

### 1. Create MCP Config

Create or edit `mcp.json`:

**MacOS**: `/Users/your-username/.cursor/mcp.json`
**Windows**: `C:\Users\your-username\.cursor\mcp.json`

### 2. Add Server Configuration

```json
{
  "mcpServers": {
    "audit-llm": {
      "command": "npx",
      "args": [
        "@audit-llm/server",
        "postgresql://postgres:password@localhost:5432/llm_audit"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Restart Cursor

Restart Cursor to apply the changes.

## Troubleshooting

### Common Issues

1. Port already in use:
```bash
# Error: EADDRINUSE: address already in use :::4000
# Solution: Use a different port
audit-llm-server postgresql://user:password@host:5432/db 4001
```

2. Database connection failed:
```bash
# Check if database exists
createdb llm_audit

# Verify credentials
psql -h localhost -U postgres -d llm_audit
```

3. Permission issues:
```bash
# Grant necessary permissions
psql -U postgres
postgres=# GRANT ALL PRIVILEGES ON DATABASE llm_audit TO your_user;
```

4. Server not starting:
```bash
# Check environment variables
NODE_ENV=development DB_USER=postgres DB_PASSWORD=password DB_HOST=localhost DB_PORT=5432 DB_NAME=llm_audit npm run dev

# Check running processes
lsof -i :4000
```

### Environment Variables

```env
# Server Configuration
PORT=4000                    # Default port
NODE_ENV=development        # or production/test

# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=llm_audit
DB_SSL=false
DB_APPLICATION_NAME=llm_auditor
```

## API Documentation

### GET /schema
Returns the JSON schema for log entries:
```json
{
  "audit_logs": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "prompt": { "type": "string" },
      "response": { "type": "string" },
      "model_type": { "type": "string" },
      "model_version": { "type": "string" },
      "inferences": { "type": "object" },
      "decision_path": { "type": "object" },
      "final_decision": { "type": "string" },
      "confidence": { "type": "number" },
      "metadata": { "type": "object" },
      "created_at": { "type": "string", "format": "date-time" }
    },
    "required": ["prompt", "response", "model_type", "model_version"]
  }
}
```

### POST /api/v1/log
Create a new log entry:
```json
{
  "prompt": "User input",
  "response": "Model response",
  "modelType": "claude",
  "modelVersion": "3.5-sonnet",
  "inferences": { "key": "value" },
  "decisionPath": { "steps": [] },
  "finalDecision": "decision",
  "confidence": 0.95,
  "metadata": { "client": "cursor" }
}
```

### GET /api/v1/logs
Retrieve logs with pagination:
```
GET /api/v1/logs?limit=10&offset=0
```

### GET /health
Check server status:
```json
{
  "status": "healthy"
}
```

## Development

### Running Tests
```bash
# Create test database
createdb llm_audit_test

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Building
```bash
# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Install dependencies and set up development environment
4. Make your changes
5. Run tests and ensure they pass
6. Update documentation
7. Submit a pull request

## License

MIT License

Copyright (c) 2024 Sakhil Chawla
