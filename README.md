# @audit-llm/server

A server for auditing and logging LLM interactions, supporting both HTTP API and Model Context Protocol (MCP) modes. This server is designed to work seamlessly with Claude and other LLM clients.

## Features

- Dual-mode operation:
  - HTTP API for REST-based interactions
  - MCP protocol support for direct integration with Claude Desktop
- PostgreSQL database for reliable storage
- Structured logging with configurable levels
- Health check endpoint
- Graceful shutdown handling
- TypeScript support
- Comprehensive test suite

## Installation

```bash
npm install @audit-llm/server
```

## Configuration

Create a `.env` file in your project root:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
PGHOST=localhost
PGPORT=5432
PGDATABASE=audit_llm
PGUSER=postgres
PGPASSWORD=your_password
```

## Usage

### HTTP Mode

Start the server in HTTP mode:

```bash
npm start
```

Available endpoints:
- `GET /health` - Health check endpoint
- `POST /api/interactions` - Log an interaction

Example interaction logging:
```bash
curl -X POST http://localhost:4000/api/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "response": "The capital of France is Paris.",
    "modelType": "claude-3-opus",
    "modelVersion": "1.0",
    "metadata": {
      "client": "web",
      "timestamp": "2024-03-20T12:00:00Z"
    }
  }'
```

### MCP Mode

Start the server in MCP mode:

```bash
npm run start:mcp
```

The server will accept JSON-RPC messages through stdin/stdout. Supported methods:
- `initialize` - Initialize the connection
- `tools/list` - List available tools
- `resources/list` - List available resources
- `prompts/list` - List available prompts
- `interaction/log` - Log an interaction
- `heartbeat` - Keep the connection alive

## Development

1. Clone the repository:
```bash
git clone https://github.com/sakhilchawla/audit-llm-server.git
cd audit-llm-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
createdb audit_llm
```

4. Create `.env` file with your configuration

5. Run tests:
```bash
npm test        # Run all tests
npm run test:http  # Run HTTP tests only
npm run test:mcp   # Run MCP tests only
```

6. Start development server:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version History

- 1.1.1 - Improved error handling, fixed HTTP endpoints, enhanced test coverage
- 1.1.0 - Added HTTP mode support
- 1.0.19 - Initial public release
