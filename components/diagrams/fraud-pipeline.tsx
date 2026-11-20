import {
  COMPLIANCE_GUARD_PIPELINE_SPEC,
  type DiagramSpec,
  FRAUD_PIPELINE_SPEC,
  GEO_AI_PIPELINE_SPEC,
  LEGAL_AI_PIPELINE_SPEC,
  PRODUCTION_TEMPLATE_PIPELINE_SPEC,
} from "@/content/diagrams";
import { Pipeline } from "./pipeline";

// Diagram text lives in content/diagrams.ts only, so the rendered diagram and
// the assistant corpus (scripts/build-assistant-corpus.ts) can't drift apart.
function SpecPipeline({ spec }: { spec: DiagramSpec }) {
  return (
    <Pipeline
      id={spec.id}
      title={spec.title}
      description={spec.description}
      steps={[...spec.steps]}
      notes={[...spec.notes]}
    />
  );
}

/** Scoring path of the credit-card fraud model (facts: the case study's evidence). */
export function FraudPipeline() {
  return <SpecPipeline spec={FRAUD_PIPELINE_SPEC} />;
}

/** LegalAI Kenya's retrieval path (facts: the case study's evidence). */
export function LegalAiPipeline() {
  return <SpecPipeline spec={LEGAL_AI_PIPELINE_SPEC} />;
}

/** ComplianceGuard's monitoring path (facts: the case study's evidence). */
export function ComplianceGuardPipeline() {
  return <SpecPipeline spec={COMPLIANCE_GUARD_PIPELINE_SPEC} />;
}

/** GEO-AI cropland mapping's modelling path (facts: the case study's Approach). */
export function GeoAiPipeline() {
  return <SpecPipeline spec={GEO_AI_PIPELINE_SPEC} />;
}

/** production-ai-template's request path (facts: the case study's Approach). */
export function ProductionTemplatePipeline() {
  return <SpecPipeline spec={PRODUCTION_TEMPLATE_PIPELINE_SPEC} />;
}
