# Audit LLM Decisions Server

A robust server for logging and auditing LLM interactions, decisions, and their reasoning processes. This system helps track and analyze how LLMs make decisions, providing transparency and accountability in AI systems.

## Features

- Log LLM interactions with detailed context
- Track decision-making processes and inferences
- Store confidence scores and final decisions
- Query and analyze historical interactions
- RESTful API for easy integration
- Rate limiting and security features
- Comprehensive error handling

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/audit-llm-server.git
cd audit-llm-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration.

4. Create the database:
```bash
createdb llm_audit
```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

## API Endpoints

### POST /log
Log a new LLM interaction.

```json
{
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
    "client": "web-interface",
    "timestamp": "2024-04-06T06:00:00.000Z",
    "conversation_type": "technical_explanation"
  }
}
```

### GET /logs
Retrieve logged interactions with pagination and filtering.

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `modelType`: Filter by model type
- `startDate`: Filter by start date
- `endDate`: Filter by end date

### GET /health
Check server health status.

## Docker

Build and run with Docker:

```bash
docker-compose up --build
```

This will start both the server and a PostgreSQL instance.

## Environment Variables

- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name (default: llm_audit)
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_SSL`: Enable SSL for database (true/false)
- `DB_APPLICATION_NAME`: Application name for database connections

See `.env.example` for all available options.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
