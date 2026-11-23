import Link from "next/link";
import {
  Outcome,
  RecordedCaption,
  type Recorded,
} from "@/components/demos/fraud-outcome";

/**
 * Server-rendered stand-in for the fraud demo on the home page: the recorded
 * result for the default sample, so the section opens on real figures with
 * no JavaScript, plus a link to the demo's own page. A test checks that the
 * recorded result still matches what the deployed model returns.
 */
export function FraudPreview({ recorded }: { recorded: Recorded }) {
  return (
    <div className="font-sans">
      <RecordedCaption recordedOn={recorded.recordedOn} />
      <Outcome result={recorded.result} />
      <p className="text-muted mt-6 text-sm">
        The live demo loads as you scroll. It also runs on its own page:{" "}
        <Link href="/demos/fraud">open the fraud-score explorer</Link>.
      </p>
    </div>
  );
}
