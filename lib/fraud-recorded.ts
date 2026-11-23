import type { Recorded } from "@/components/demos/fraud-outcome";
import data from "@/public/demos/fraud/recorded-example.json";

/**
 * The fraud demo's recorded example: a real result of the deployed model for
 * one served sample. It is the same file the demo falls back to when the
 * function is down; tests/python/test_fraud.py checks it still matches what
 * the model returns, so it can't drift from the live demo.
 */
export const fraudRecorded: Recorded = {
  sampleId: data.sampleId,
  recordedOn: data.recordedOn,
  result: data.result as Recorded["result"],
};
