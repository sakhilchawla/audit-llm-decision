import { Request, Response } from 'express';
import { AuditTrailRepository } from '../repositories/AuditTrailRepository';
import { AuditTrail } from '../types/AuditTrail';
import { v4 as uuidv4 } from 'uuid';
import { ClaudeInteraction } from '../types/AuditTrail';
import { LLMFeature } from '../types/AuditTrail';

export class AuditTrailController {
  constructor(private repository: AuditTrailRepository) {}

  async create(req: Request, res: Response) {
    try {
      const auditTrail: AuditTrail = {
        ...req.body,
        id: uuidv4(),
        timestamp: new Date()
      };
      
      await this.repository.save(auditTrail);
      res.status(201).json(auditTrail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create audit trail' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const trail = await this.repository.findById(req.params.id);
      if (!trail) {
        return res.status(404).json({ error: 'Audit trail not found' });
      }
      res.json(trail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve audit trail' });
    }
  }

  async getByModel(req: Request, res: Response) {
    try {
      const trails = await this.repository.findByModelVersion(req.params.modelVersion);
      res.json(trails);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve audit trails' });
    }
  }

  async createClaudeInteraction(req: Request, res: Response) {
    try {
      const interaction: ClaudeInteraction = req.body;
      
      const auditTrail: AuditTrail = {
        id: uuidv4(),
        timestamp: new Date(),
        modelVersion: interaction.modelVersion,
        featureSet: 'claude-interaction',
        features: [
          {
            name: 'prompt',
            value: interaction.prompt,
            impact: 1.0
          } as LLMFeature
        ],
        decisionPath: [
          {
            stepType: 'feature',
            description: 'Claude prompt processing',
            confidence: 1.0
          }
        ],
        finalDecision: interaction.response,
        confidence: 1.0,
        metadata: interaction.metadata
      };
      
      await this.repository.save(auditTrail);
      res.status(201).json(auditTrail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create Claude interaction audit trail' });
    }
  }
} 