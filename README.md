# MCP Logging Server

A robust logging server for tracking and auditing AI model interactions. Built with Node.js, TypeScript, and PostgreSQL.

## Features

- Automatic logging of AI model interactions
- Structured storage of model inferences and decision paths
- RESTful API endpoints for logging and retrieval
- Configurable database settings via environment variables
- Health check endpoints for monitoring
- Production-ready with error handling and validation

## Quick Start

> **🤖 AI Models**: For quick integration instructions, see [MODEL_INSTRUCTIONS.md](MODEL_INSTRUCTIONS.md)

1. **Clone and Install**
```bash
git clone https://github.com/yourusername/mcp-logging-server.git
cd mcp-logging-server
npm install
```

2. **Configure Environment**
Copy `.env.example` to `.env` and set your values:
```bash
cp .env.example .env
```

Required environment variables:
```
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mcp_audit
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
DB_MAX_POOL_SIZE=20
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=0
DB_APPLICATION_NAME="mcp_logger"
DB_SCHEMA="public"

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN="*"              # Set to specific origins in production
CORS_METHODS="GET,POST"
```

3. **Start the Server**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Log Interaction
```bash
POST /api/v1/log
Content-Type: application/json

{
  "prompt": "user question",
  "response": "model response",
  "modelType": "model name",
  "modelVersion": "version",
  "inferences": {
    // reasoning process
  },
  "decisionPath": {
    // steps taken
  },
  "finalDecision": "action taken",
  "confidence": 0.95,
  "metadata": {
    // additional context
  }
}
```

### Retrieve Logs
```bash
GET /api/v1/logs?modelType=model-name&limit=10
```

### Health Check
```bash
GET /health
```

## Deployment

### Local Development
```bash
npm run dev
```

### Docker Deployment
1. Build the image:
   ```bash
   docker build -t mcp-logging-server .
   ```
2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Cloud Deployment

#### Prerequisites
- PostgreSQL database
- Node.js 16+ environment
- Environment variables configured

#### Steps
1. Set up environment variables for production
2. Install dependencies:
   ```bash
   npm ci --production
   ```
3. Build the TypeScript code:
   ```bash
   npm run build
   ```
4. Start the server:
   ```bash
   npm start
   ```

#### Cloud Platform Specific

##### Heroku
```bash
git push heroku main
```

##### AWS Elastic Beanstalk
```bash
eb deploy
```

##### Google Cloud Run
```bash
gcloud run deploy
```

## Monitoring

- Health endpoint: `GET /health`
- Database connection status
- Server logs with configurable levels
- Error tracking
- Rate limit monitoring
- Connection pool metrics

## Security

- Input validation using express-validator
- SQL injection protection with parameterized queries
- Rate limiting (configurable via environment variables)
- CORS protection (configurable via environment variables)
- Error handling with sanitized responses
- SSL/TLS support for database connections
- Secure headers with helmet.js

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.