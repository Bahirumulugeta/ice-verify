import type { RiskAssessment, RiskEvaluationInput, RiskFlag, RiskLevel } from './types.js';

function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export class RiskEngine {
  evaluate(input: RiskEvaluationInput): RiskAssessment {
    const flags: RiskFlag[] = [];
    let score = 0;

    if (!input.paymentExists) {
      score += 40;
      flags.push({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment could not be found with the provider',
        severity: 'HIGH',
      });
    }

    if (!input.amountMatches) {
      score += 35;
      flags.push({
        code: 'AMOUNT_MISMATCH',
        message: 'Expected amount does not match provider amount',
        severity: 'HIGH',
      });
    }

    if (!input.receiverMatches) {
      score += 35;
      flags.push({
        code: 'RECEIVER_MISMATCH',
        message: 'Expected receiver does not match provider receiver',
        severity: 'HIGH',
      });
    }

    if (!input.currencyMatches) {
      score += 25;
      flags.push({
        code: 'CURRENCY_MISMATCH',
        message: 'Expected currency does not match provider currency',
        severity: 'MEDIUM',
      });
    }

    if (input.isDuplicate) {
      score += 80;
      flags.push({
        code: 'DUPLICATE_REFERENCE',
        message: 'Payment reference appears to be a duplicate',
        severity: 'CRITICAL',
      });
    }

    if (!input.providerConsistent) {
      score += 20;
      flags.push({
        code: 'PROVIDER_INCONSISTENCY',
        message: 'Provider response was inconsistent with request',
        severity: 'MEDIUM',
      });
    }

    if (input.verificationFrequencyHigh) {
      score += 15;
      flags.push({
        code: 'HIGH_VERIFICATION_FREQUENCY',
        message: 'Unusually high verification frequency detected',
        severity: 'MEDIUM',
      });
    }

    if (input.timestampAnomaly) {
      score += 10;
      flags.push({
        code: 'TIMESTAMP_ANOMALY',
        message: 'Transaction timestamp appears anomalous',
        severity: 'LOW',
      });
    }

    if (input.receiptMismatch) {
      score += 30;
      flags.push({
        code: 'RECEIPT_MISMATCH',
        message: 'Receipt details do not match payment details',
        severity: 'HIGH',
      });
    }

    const normalizedScore = Math.min(100, score);
    return {
      score: normalizedScore,
      level: levelFromScore(normalizedScore),
      flags,
    };
  }
}
