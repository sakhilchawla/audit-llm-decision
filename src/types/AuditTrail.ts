export interface ModelFeature {
  name: string;
  value: string | number;
  impact?: number;
}

export interface DecisionStep {
  stepType: 'rule' | 'branch' | 'feature';
  description: string;
  confidence?: number;
}

export interface AuditTrail {
  id: string;
  timestamp: Date;
  modelVersion: string;
  featureSet: string;
  features: ModelFeature[];
  decisionPath: DecisionStep[];
  finalDecision: string;
  confidence: number;
  metadata?: {
    client?: string;
    sessionId?: string;
    userId?: string;
  };
}

export interface ClaudeInteraction {
  prompt: string;
  response: string;
  modelVersion: string;  // e.g. "claude-3-opus"
  timestamp?: Date;
  metadata?: {
    client: string;  // e.g. "cursor", "claude-desktop"
    sessionId?: string;
    userId?: string;
  };
}

export interface LLMFeature extends ModelFeature {
  type: 'prompt' | 'context' | 'system_prompt';
  content: string;
} 