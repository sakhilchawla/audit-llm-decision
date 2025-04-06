# MCP Logging System - AI Model Instructions

## Quick Start
Send a POST request to `http://localhost:4000/api/v1/log` with your interaction data. That's it!

## Required Information
Every log must include:
- `prompt`: The user's input/question
- `response`: Your response/answer
- `modelType`: Your model identifier (e.g., "claude", "gpt")
- `modelVersion`: Your version (e.g., "3.5-sonnet")

## Enhanced Logging (Recommended)
Include these fields for better audit trails:
- `inferences`: Your reasoning process as JSON
- `decisionPath`: Steps taken to reach conclusion (as object)
- `finalDecision`: Your ultimate decision/action
- `confidence`: Confidence score (0.0 to 1.0)
- `metadata`: Additional context

## Example Request
```bash
curl -X POST http://localhost:4000/api/v1/log \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is quantum computing?",
    "response": "Quantum computing uses quantum phenomena...",
    "modelType": "claude",
    "modelVersion": "3.5-sonnet",
    "inferences": {
      "key_concepts": ["superposition", "entanglement"],
      "relevance_score": 0.95
    },
    "decisionPath": {
      "analysis": {
        "step1": "identify_topic",
        "step2": "assess_complexity",
        "step3": "formulate_response"
      },
      "reasoning": "Technical concept requires clear explanation"
    },
    "finalDecision": "provide_basic_explanation",
    "confidence": 0.92,
    "metadata": {
      "client": "your-client-name",
      "timestamp": "2024-04-06T06:00:00.000Z",
      "conversation_type": "technical_explanation"
    }
  }'
```

## Database Schema
Your logs are stored in the `model_interactions` table with the following structure:
```sql
CREATE TABLE model_interactions (
  id SERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  inferences JSONB,
  decision_path JSONB,
  final_decision TEXT,
  confidence FLOAT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices
1. **Structured Inferences**: 
   - Use clear keys in your inferences JSON
   - Include relevant scores and classifications
   - Document your reasoning process

2. **Decision Path**:
   - Structure as an object, not an array
   - Include step-by-step reasoning
   - Add context for each decision

3. **Metadata**:
   - Always include timestamp
   - Add client identifier
   - Include conversation context
   - Add any relevant tags

4. **Error Handling**:
   - Handle 400 responses (invalid data)
   - Handle 429 responses (rate limiting)
   - Retry on 5xx errors with backoff

## Verification
Check your logged interactions:
```bash
curl "http://localhost:4000/api/v1/logs?modelType=your-model-name&limit=1"
```

## Common Issues
1. **Port Conflicts**: Server runs on port 4000 by default
2. **Data Validation**: All required fields must be present
3. **JSON Format**: Ensure valid JSON structure
4. **Decision Path**: Must be object, not array format

## Need Help?
- Check server health: `curl http://localhost:4000/health`
- View recent logs: `curl http://localhost:4000/api/v1/logs`
- Filter by model: `curl "http://localhost:4000/api/v1/logs?modelType=your-model-name"` 