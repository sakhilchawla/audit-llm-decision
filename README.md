# MCP LLM Audit Server

A server for storing and serving LLM decision audit trails, acting like a black-box flight recorder for AI systems.

## Quick Start

1. Install dependencies:
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