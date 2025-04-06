# Audit LLM Decisions - Schema Documentation

## Database Schema

The system uses PostgreSQL to store LLM interactions and decisions. Below is a detailed description of the database schema.

### Table: model_interactions

This table stores all LLM interactions, including the original prompts, responses, and decision-making process.

```sql
CREATE TABLE model_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model_type VARCHAR(255) NOT NULL,
  model_version VARCHAR(255) NOT NULL,
  inferences JSONB,
  decision_path JSONB,
  final_decision TEXT,
  confidence FLOAT,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for better query performance
CREATE INDEX idx_model_interactions_model_type ON model_interactions(model_type);
CREATE INDEX idx_model_interactions_created_at ON model_interactions(created_at DESC);
```

### Field Descriptions

- `id`: Unique identifier for each interaction
- `prompt`: The original input/question from the user
- `response`: The LLM's response to the prompt
- `model_type`: The type of LLM (e.g., "claude", "gpt")
- `model_version`: Version of the model used
- `inferences`: JSON object containing the model's reasoning process
- `decision_path`: JSON object detailing the steps taken to reach the conclusion
- `final_decision`: The ultimate decision or action taken
- `confidence`: Confidence score (0.0 to 1.0) in the decision
- `metadata`: Additional context about the interaction
- `created_at`: Timestamp of when the interaction was logged

### Example Data

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "prompt": "What is quantum computing?",
  "response": "Quantum computing uses quantum phenomena...",
  "model_type": "claude",
  "model_version": "3.5-sonnet",
  "inferences": {
    "key_concepts": ["superposition", "entanglement"],
    "relevance_score": 0.95
  },
  "decision_path": {
    "analysis": {
      "step1": "identify_topic",
      "step2": "assess_complexity",
      "step3": "formulate_response"
    },
    "reasoning": "Technical concept requires clear explanation"
  },
  "final_decision": "provide_basic_explanation",
  "confidence": 0.92,
  "metadata": {
    "client": "web-interface",
    "timestamp": "2024-04-06T06:00:00.000Z",
    "conversation_type": "technical_explanation"
  },
  "created_at": "2024-04-06T06:00:00.000Z"
}
```

### Best Practices

When sending data to the Audit LLM system:

1. Always include all required fields:
   - prompt
   - response
   - model_type
   - model_version
   - metadata

2. Structure your inferences and decision paths consistently:
   - Use clear, descriptive keys
   - Include relevant scores and classifications
   - Document the reasoning process

3. Use the metadata field to provide context:
   - Include client information
   - Add timestamps
   - Specify conversation types or categories

4. Set appropriate confidence scores:
   - Use 0.0 to 1.0 range
   - Be realistic about confidence levels
   - Consider multiple factors in scoring

### Query Examples

1. Get recent interactions:
```sql
SELECT * FROM model_interactions 
ORDER BY created_at DESC 
LIMIT 10;
```

2. Filter by model type:
```sql
SELECT * FROM model_interactions 
WHERE model_type = 'claude' 
ORDER BY created_at DESC;
```

3. Find high-confidence decisions:
```sql
SELECT * FROM model_interactions 
WHERE confidence > 0.9 
ORDER BY confidence DESC;
``` 