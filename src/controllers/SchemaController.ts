import { Request, Response } from 'express';

export class SchemaController {
  static getSchema(req: Request, res: Response): void {
    res.json({
      audit_logs: {
        type: 'object',
        description: 'Audit log entry for LLM interactions',
        properties: {
          id: { 
            type: 'string', 
            format: 'uuid',
            description: 'Unique identifier for the log entry' 
          },
          prompt: { 
            type: 'string',
            description: 'User input or prompt sent to the model' 
          },
          response: { 
            type: 'string',
            description: 'Model\'s response to the prompt' 
          },
          model_type: { 
            type: 'string',
            description: 'Type of model used (e.g., claude, gpt)' 
          },
          model_version: { 
            type: 'string',
            description: 'Version of the model used' 
          },
          inferences: { 
            type: 'object',
            description: 'Model\'s inference details and context' 
          },
          decision_path: { 
            type: 'object',
            description: 'Steps and reasoning in the decision process' 
          },
          final_decision: { 
            type: 'string',
            description: 'Final decision or action taken' 
          },
          confidence: { 
            type: 'number',
            description: 'Confidence score for the decision',
            minimum: 0,
            maximum: 1 
          },
          metadata: { 
            type: 'object',
            description: 'Additional contextual information' 
          },
          created_at: { 
            type: 'string', 
            format: 'date-time',
            description: 'Timestamp when the log was created' 
          }
        },
        required: ['prompt', 'response', 'model_type', 'model_version']
      }
    });
  }
} 