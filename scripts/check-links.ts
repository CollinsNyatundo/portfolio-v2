/**
 * Checks every outbound link that backs a claim: case-study repos, live apps
 * and evidence, project cards, and the site's own profile links (docs/06 M2.3).
 * Runs in CI on pull requests and nightly. Fails on any broken link or any
 * host outside the allow-list (docs/05 §6).
 *
 *   node scripts/check-links.ts
 */
import { join } from "node:path";
import { projects } from "../content/projects.ts";
import { site } from "../content/site.ts";
import { buildIndex } from "./build-content.ts";

export const ALLOWED_HOSTS = [
  "github.com",
  "tundotechsystems.com",
  "huggingface.co",
  "linkedin.com",
  "www.linkedin.com",
  "zindi.africa",
];
const ALLOWED_SUFFIXES = [".vercel.app", ".streamlit.app", ".mintlify.app"];

/** LinkedIn answers automated requests with HTTP 999; it can't be checked from CI. */
const UNCHECKABLE_HOSTS = ["linkedin.com", "www.linkedin.com"];

type Link = { url: string; where: string; sleeps?: boolean };

export function isAllowedHost(url: string): boolean {
  const { protocol, hostname } = new URL(url);
  return (
    protocol === "https:" &&
    (ALLOWED_HOSTS.includes(hostname) ||
      ALLOWED_SUFFIXES.some((s) => hostname.endsWith(s)))
  );
}

export function collectLinks(contentDir: string): Link[] {
  const links: Link[] = [];
  const { caseStudies } = buildIndex(contentDir);
  for (const c of caseStudies) {
    const where = `case-studies/${c.slug}`;
    if (c.repoUrl) links.push({ url: c.repoUrl, where });
    if (c.liveUrl) links.push({ url: c.liveUrl, where, sleeps: c.sleeps });
    for (const e of c.evidence)
      if (e.url)
        links.push({ url: e.url, where: `${where} evidence "${e.label}"` });
  }
  for (const p of projects) {
    if (p.repoUrl) links.push({ url: p.repoUrl, where: `projects/${p.slug}` });
    if (p.liveUrl)
      links.push({
        url: p.liveUrl,
        where: `projects/${p.slug}`,
        sleeps: p.sleeps,
      });
  }
  for (const [name, url] of Object.entries(site.links))
    links.push({ url, where: `site.links.${name}` });
  return links;
}

async function status(url: string): Promise<number> {
  const attempt = async (method: "HEAD" | "GET") => {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "user-agent":
          "portfolio-v2 link checker (+https://github.com/CollinsNyatundo/portfolio-v2)",
      },
    });
    await response.body?.cancel();
    return response.status;
  };
  const head = await attempt("HEAD");
  // Some hosts refuse HEAD; confirm with GET before calling a link broken.
  return head === 403 || head === 405 || head >= 500 ? attempt("GET") : head;
}

async function main() {
  const links = collectLinks(join(import.meta.dirname, "..", "content"));
  const unique = [...new Map(links.map((l) => [l.url, l])).values()];
  const failures: string[] = [];

  await Promise.all(
    unique.map(async (link) => {
      if (!isAllowedHost(link.url)) {
        failures.push(
          `${link.url} (${link.where}): host not on the allow-list`,
        );
        return;
      }
      if (UNCHECKABLE_HOSTS.includes(new URL(link.url).hostname)) return;
      try {
        const code = await status(link.url);
        // A sleeping Streamlit app redirects to its wake-up page.
        const ok = code < 400 || (link.sleeps && code === 303);
        if (!ok) failures.push(`${link.url} (${link.where}): HTTP ${code}`);
      } catch (error) {
        failures.push(
          `${link.url} (${link.where}): ${error instanceof Error ? error.message : error}`,
        );
      }
    }),
  );

  if (failures.length) {
    console.error(
      `Broken or disallowed links:\n  - ${failures.sort().join("\n  - ")}`,
    );
    process.exit(1);
  }
  console.log(`links ok: ${unique.length} checked`);
}

if (import.meta.main) await main();
