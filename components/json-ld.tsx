import { headers } from "next/headers";
import { jsonLdHtml } from "@/lib/seo";

/**
 * A schema.org data block. It is never executed, but it still carries the
 * per-request nonce so the strict CSP stays exception-free (D-28).
 */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
