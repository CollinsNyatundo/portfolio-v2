import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Archivo, Geist_Mono, Literata } from "next/font/google";
import { connection } from "next/server";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name}, ${site.title}`,
    template: `%s · ${site.name}`,
  },
  description:
    "Evidence-first portfolio of Collins Nyagaka, an AI and machine learning engineer in Nairobi.",
  authors: [{ name: site.fullName }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_KE",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c9ccc6" },
    { media: "(prefers-color-scheme: dark)", color: "#131615" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so Next.js can apply the CSP nonce from proxy.ts (D-28).
  await connection();
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${literata.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-bg text-text min-h-dvh">
        <a
          href="#main"
          className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:font-sans focus:text-sm"
        >
          Skip to main content
        </a>
        {children}
        {/* The script is served by Vercel only; elsewhere it would 404. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
