# MCP LLM Audit Server

A server for storing and serving LLM decision audit trails, acting like a black-box flight recorder for AI systems.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Create Audit Trail
```bash
POST /api/v1/audit-trail

{
  "modelVersion": "loan-model-v1",
  "featureSet": "credit-risk-features",
  "features": [
    {
      "name": "age_bucket",
      "value": 3,
      "impact": 0.4
    }
  ],
  "decisionPath": [
    {
      "stepType": "feature",
      "description": "Age bucket 3 indicates medium risk",
      "confidence": 0.8
    }
  ],
  "finalDecision": "Reject loan",
  "confidence": 0.85
}
```

### Get Audit Trail
```bash
GET /api/v1/audit-trail/:id
GET /api/v1/audit-trail/model/:modelVersion
```

### Claude Interaction Logging
#### Create Claude Interaction
```bash
POST /api/v1/claude/interaction

{
  "prompt": "What is AI?",
  "response": "AI is...",
  "modelVersion": "claude-3-opus",
  "metadata": {
    "client": "cursor",
    "sessionId": "user-session-id"
  }
}
```

## Docker

To run the server using Docker, use the following command:
```bash
docker-compose up -d
```

## Environment Variables
```bash
PORT=4000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mcp_audit
DB_PASSWORD=your_password
DB_PORT=5432
DB_SSL=false
```

## Claude Client Integration

### Cursor Integration
```typescript
// In your Cursor plugin/extension
async function logClaudeInteraction(prompt: string, response: string) {
  await fetch('http://localhost:4000/api/v1/claude/interaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      response,
      modelVersion: 'claude-3-opus',
      metadata: {
        client: 'cursor',
        sessionId: 'user-session-id'
      }
    })
  });
}

// Use in your Claude interaction handler
onClaudeResponse(async (prompt, response) => {
  await logClaudeInteraction(prompt, response);
});
```

### Claude Desktop Integration
```typescript
// In your Claude Desktop app
const logInteraction = async (prompt: string, response: string) => {
  await fetch('http://localhost:4000/api/v1/claude/interaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      response,
      modelVersion: 'claude-3-opus',
      metadata: {
        client: 'claude-desktop',
        userId: 'user-id'
      }
    })
  });
};
```

## Conclusion

This README provides all the necessary information to set up, run, and integrate the MCP LLM Audit Server with various clients. If you have any questions or need further assistance, feel free to reach out!