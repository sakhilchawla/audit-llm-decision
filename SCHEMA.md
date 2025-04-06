# MCP Logging Server Schema Documentation

## Database Schema

### Table: model_interactions

This table stores all model interactions across different clients and model types.

```sql
CREATE TABLE model_interactions (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Column Descriptions

- `id`: Unique identifier for each interaction
- `prompt`: The input text/prompt sent to the model
- `response`: The model's response text
- `model_type`: Type of model (e.g., 'claude', 'gpt', 'llama')
- `model_version`: Version of the model (e.g., '3.5-sonnet', '4', '2-70b')
- `metadata`: JSON object containing additional information
- `created_at`: Timestamp when the interaction was logged

#### Metadata Schema

The `metadata` column is a JSONB field that can include:

```json
{
  "client": "string",          // Client identifier
  "timestamp": "ISO-8601",     // Client-side timestamp
  "temperature": "number",     // Model temperature setting
  "context_length": "number",  // Context window size
  "user_id": "string",        // Optional user identifier
  "session_id": "string",     // Optional session identifier
  "tags": ["string"],         // Optional tags for categorization
  "custom_fields": {}         // Any additional client-specific data
}
```

## Indexes

```sql
-- For efficient querying by model type and version
CREATE INDEX idx_model_interactions_type_version ON model_interactions(model_type, model_version);

-- For timestamp-based queries
CREATE INDEX idx_model_interactions_created_at ON model_interactions(created_at);

-- For JSON metadata queries
CREATE INDEX idx_model_interactions_metadata ON model_interactions USING GIN (metadata);
```

## Example Queries

1. **Get recent interactions for a specific model:**
```sql
SELECT * FROM model_interactions 
WHERE model_type = 'claude' 
ORDER BY created_at DESC 
LIMIT 10;
```

2. **Search by metadata fields:**
```sql
SELECT * FROM model_interactions 
WHERE metadata->>'client' = 'web-app' 
AND metadata->>'user_id' = '123';
```

3. **Get interaction counts by model:**
```sql
SELECT model_type, model_version, COUNT(*) 
FROM model_interactions 
GROUP BY model_type, model_version;
```

## API Payload Example

When sending data to the MCP logging server:

```json
{
  "prompt": "What is AI?",
  "response": "AI is...",
  "modelType": "claude",
  "modelVersion": "3.5-sonnet",
  "metadata": {
    "client": "web-app",
    "timestamp": "2024-04-06T05:45:00Z",
    "temperature": 0.7,
    "user_id": "user_123",
    "session_id": "sess_456",
    "tags": ["test", "production"]
  }
}
``` 