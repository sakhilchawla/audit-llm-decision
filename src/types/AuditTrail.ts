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
} 