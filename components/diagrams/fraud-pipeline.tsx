import {
  COMPLIANCE_GUARD_PIPELINE_SPEC,
  FRAUD_PIPELINE_SPEC,
  LEGAL_AI_PIPELINE_SPEC,
} from "@/content/diagrams";
import { Pipeline } from "./pipeline";

/** Scoring path of the credit-card fraud model (facts: the case study's evidence). */
export function FraudPipeline() {
  return (
    <Pipeline
      id={FRAUD_PIPELINE_SPEC.id}
      title={FRAUD_PIPELINE_SPEC.title}
      description={FRAUD_PIPELINE_SPEC.description}
      steps={[...FRAUD_PIPELINE_SPEC.steps]}
      notes={[...FRAUD_PIPELINE_SPEC.notes]}
    />
  );
}

/** LegalAI Kenya's retrieval path (facts: the case study's evidence). */
export function LegalAiPipeline() {
  return (
    <Pipeline
      id={LEGAL_AI_PIPELINE_SPEC.id}
      title={LEGAL_AI_PIPELINE_SPEC.title}
      description={LEGAL_AI_PIPELINE_SPEC.description}
      steps={[...LEGAL_AI_PIPELINE_SPEC.steps]}
      notes={[...LEGAL_AI_PIPELINE_SPEC.notes]}
    />
  );
}

/** ComplianceGuard's monitoring path (facts: the case study's evidence). */
export function ComplianceGuardPipeline() {
  return (
    <Pipeline
      id={COMPLIANCE_GUARD_PIPELINE_SPEC.id}
      title={COMPLIANCE_GUARD_PIPELINE_SPEC.title}
      description={COMPLIANCE_GUARD_PIPELINE_SPEC.description}
      steps={[...COMPLIANCE_GUARD_PIPELINE_SPEC.steps]}
      notes={[...COMPLIANCE_GUARD_PIPELINE_SPEC.notes]}
    />
  );
}
