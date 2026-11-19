"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";

// The demo's code loads only when Act IV comes near, so the first view of
// the home page doesn't pay for it (Lighthouse budget, 02 §8).
const FraudDemo = dynamic(
  () => import("@/components/demos/fraud-demo").then((m) => m.FraudDemo),
  { loading: () => <DemoPlaceholder /> },
);

/**
 * Shown in the server HTML and until the demo's code arrives. It carries a
 * real link, so a reader without JavaScript (or a crawler) still reaches the
 * demo instead of three empty bars.
 */
function DemoPlaceholder() {
  return (
    <div>
      <ul aria-hidden="true" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="bg-surface-2 h-10 rounded-sm" />
        ))}
      </ul>
      <p className="text-muted mt-4 font-sans text-sm">
        Loading the demo. It also runs on its own page:{" "}
        <Link href="/demos/fraud">open the fraud-score explorer</Link>.
      </p>
    </div>
  );
}

export function LazyFraudDemo() {
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
        <Suspense fallback={<DemoPlaceholder />}>
          <FraudDemo writesLedger />
        </Suspense>
      ) : (
        <DemoPlaceholder />
      )}
    </div>
  );
}
