export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskFlag {
  code: string;
  message: string;
  severity: RiskLevel;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  flags: RiskFlag[];
}

export interface RiskEvaluationInput {
  paymentExists: boolean;
  amountMatches: boolean;
  receiverMatches: boolean;
  currencyMatches: boolean;
  isDuplicate: boolean;
  providerConsistent: boolean;
  verificationFrequencyHigh: boolean;
  timestampAnomaly: boolean;
  receiptMismatch: boolean;
}
