"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Recorded } from "@/components/demos/fraud-outcome";

// The demo's code loads only when Act IV comes near, so the first view of
// the home page doesn't pay for it (Lighthouse budget, 02 §8). React.lazy
// (not next/dynamic) so the fallback can be the server-rendered preview.
const FraudDemo = lazy(() =>
  import("@/components/demos/fraud-demo").then((m) => ({
    default: m.FraudDemo,
  })),
);

/**
 * `preview` is rendered on the server (a recorded result of the deployed
 * model, with a link to the demo page), so the first score is in the HTML
 * before any of the demo's JavaScript loads. It stays until the demo's code
 * arrives; the demo then opens on the same recorded result.
 */
export function LazyFraudDemo({
  preview,
  recorded,
}: {
  preview: ReactNode;
  recorded: Recorded;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      // Start loading about one screen before it scrolls into view.
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {near ? (
        <Suspense fallback={preview}>
          <FraudDemo writesLedger recorded={recorded} />
        </Suspense>
      ) : (
        preview
      )}
    </div>
  );
}
