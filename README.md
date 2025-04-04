# MCP (Model Context Protocol) Server

A server for storing and serving AI model decision audit trails, acting like a black-box flight recorder for AI systems.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

3. Run locally:
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

## Docker

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
