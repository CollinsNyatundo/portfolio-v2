import Link from "next/link";
import { BenchObject } from "@/components/bench-object";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";

export default function NotFound() {
  return (
    <>
      <Folio title="Not found" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-14 lg:pt-24">
          <div className="bg-surface border-border grid items-center gap-8 rounded-[2px] border p-6 sm:p-10 md:grid-cols-[15rem_1fr]">
            <BenchObject slug="404" />
            <div>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                This page isn&apos;t here.
              </h1>
              <p className="mt-4 max-w-[60ch] font-serif">
                It may not be written yet, or the link is wrong. Start from the{" "}
                <Link href="/">title page</Link>, see the{" "}
                <Link href="/work">work</Link>, or{" "}
                <Link href="/contact">get in touch</Link>.
              </p>
            </div>
          </div>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-03" />
        </div>
      </div>
    </>
  );
}
