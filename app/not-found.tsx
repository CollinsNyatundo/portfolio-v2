import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";

export default function NotFound() {
  return (
    <>
      <Folio title="Not found" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-24 lg:pt-40">
          <h1 className="font-serif text-5xl font-medium tracking-[-0.015em] lg:text-6xl">
            This page isn&apos;t here.
          </h1>
          <p className="mt-6 max-w-[62ch]">
            It may not be written yet, or the link is wrong. Start from the{" "}
            <Link href="/">title page</Link>, see the{" "}
            <Link href="/work">work</Link>, or{" "}
            <Link href="/contact">get in touch</Link>.
          </p>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-03" />
        </div>
      </div>
    </>
  );
}
