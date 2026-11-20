import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";

/**
 * Without this, a 404 inherited the home page's title, description and
 * canonical, and (because pages stream) Next.js's automatic noindex didn't
 * reach the head. Say so explicitly.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "This page isn't on collinsnyagaka.com.",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

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
