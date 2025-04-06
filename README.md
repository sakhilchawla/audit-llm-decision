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

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Quick Start Guide

### 1. Database Setup

```bash
# Create database
createdb llm_audit

# Verify connection
psql -h localhost -U postgres -d llm_audit
```

### 2. Installation & Usage

#### Option A: NPX (Recommended)

```bash
# Run directly without installation
npx @audit-llm/server "postgresql://postgres:password@localhost:5432/llm_audit?application_name=local_test" 4000
```

Note: The `application_name` parameter in the connection string is important for tracking database connections.

#### Option B: Global Installation

```bash
# Install globally (requires sudo/admin privileges)
sudo npm install -g @audit-llm/server  # On Unix/MacOS
# or
npm install -g @audit-llm/server      # On Windows with admin privileges

# Run server
audit-llm-server "postgresql://postgres:password@localhost:5432/llm_audit?application_name=local_test" 4000
```

#### Option C: Development Usage

```bash
# Clone and install
git clone https://github.com/sakhilchawla/audit-llm-decision.git
cd audit-llm-decision
npm install

# Build
npm run build

# Run directly with Node
node dist/server.js "postgresql://postgres:password@localhost:5432/llm_audit?application_name=local_test" 4000
```

### 3. Integration with AI Tools

#### LLM Usage

For LLMs (like Claude) to start the server directly, use this command:
```bash
node dist/server.js "postgresql://postgres:password@localhost:5432/llm_audit?application_name=llm_audit" 4000
```

Note: Make sure to:
1. Replace `postgres:password` with your actual database credentials
2. Adjust the port (4000) if needed
3. The `application_name` parameter helps track which client is connecting
4. The server will respond with `{"status":"healthy"}` on the health endpoint when running correctly

#### Cursor Integration

1. Create or edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "audit-llm": {
      "command": "npx",
      "args": [
        "@audit-llm/server",
        "postgresql://postgres:password@localhost:5432/llm_audit?application_name=cursor_mcp",
        "4000"
      ],
      "env": {
        "NODE_ENV": "production",
        "DB_APPLICATION_NAME": "cursor_mcp"
      }
    }
  }
}
```

2. Restart Cursor to apply changes

#### Claude Desktop Integration

1. Create or edit `~/Library/Application Support/Claude/claude_desktop_config.json` (MacOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):
```json
{
  "mcpServers": {
    "audit-llm": {
      "command": "npx",
      "args": [
        "@audit-llm/server",
        "postgresql://postgres:password@localhost:5432/llm_audit?application_name=claude_desktop",
        "4000"
      ],
      "env": {
        "NODE_ENV": "production",
        "DB_APPLICATION_NAME": "claude_desktop"
      }
    }
  }
}
```

Note: 
- Replace `postgres:password` with your actual database credentials
- The `application_name` parameter helps identify connections in your database
- The server will respond with `{"status":"healthy"}` when running correctly
- Make sure the database exists and is accessible before starting
- The `npx` command will automatically download and run the latest version

2. Restart Claude Desktop to apply changes

## API Documentation

### Endpoints

#### GET /health
Check server health status
```bash
curl http://localhost:4000/health
```

#### GET /schema
Get JSON schema for log entries
```bash
curl http://localhost:4000/schema
```

#### POST /api/v1/log
Log an LLM interaction
```bash
curl -X POST http://localhost:4000/api/v1/log \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "User query",
    "response": "Model response",
    "model_type": "claude",
    "model_version": "3",
    "metadata": {}
  }'
```

#### GET /api/v1/logs
Retrieve logged interactions
```bash
curl http://localhost:4000/api/v1/logs
```

## Environment Variables

```env
# Server Configuration
PORT=4000                    # Default port
NODE_ENV=production         # Environment (production/development)

# Database Configuration (Optional - can be provided via connection string)
DB_USER=postgres           # Database user
DB_PASSWORD=your_password  # Database password
DB_HOST=localhost         # Database host
DB_PORT=5432             # Database port
DB_NAME=llm_audit       # Database name
DB_APPLICATION_NAME=audit_llm  # Application name for connection tracking
```

Note: Environment variables are optional if you provide the full connection string with the application_name parameter.

## Development

```bash
# Clone repository
git clone https://github.com/sakhilchawla/audit-llm-decision.git
cd audit-llm-decision

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
```bash
# Check database exists
createdb llm_audit

# Verify credentials
psql -h localhost -U postgres -d llm_audit
```

2. **Port in Use**
```bash
# Use different port
npx @audit-llm/server "postgresql://user:pass@localhost:5432/llm_audit?application_name=local_test" 4001
```

3. **Permission Issues**
```bash
# Grant database permissions
psql -U postgres
postgres=# GRANT ALL PRIVILEGES ON DATABASE llm_audit TO your_user;
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
