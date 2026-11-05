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

export function collectLinks(
  contentDir: string,
  demoList?: Parameters<typeof buildIndex>[1],
): Link[] {
  const links: Link[] = [];
  const { caseStudies } = buildIndex(contentDir, demoList);
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

/**
 * github.com repo pages time out (504) at random under load, so a bare repo
 * or profile link is checked through the REST API, which answers 404 for a
 * missing or private repo just as the page would.
 */
export function checkUrl(url: string): string {
  const u = new URL(url);
  if (u.hostname !== "github.com") return url;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length === 1) return `https://api.github.com/users/${parts[0]}`;
  if (parts.length === 2)
    return `https://api.github.com/repos/${parts[0]}/${parts[1]}`;
  return url;
}

async function status(link: string): Promise<number> {
  const url = checkUrl(link);
  const token = process.env.GITHUB_TOKEN;
  const attempt = async (method: "HEAD" | "GET") => {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "user-agent":
          "portfolio-v2 link checker (+https://github.com/CollinsNyatundo/portfolio-v2)",
        // Only ever sent to the GitHub API, to lift its anonymous rate limit.
        ...(token && url.startsWith("https://api.github.com/")
          ? { authorization: `Bearer ${token}` }
          : {}),
      },
    });
    await response.body?.cancel();
    return response.status;
  };
  const once = async () => {
    const head = await attempt("HEAD");
    // Some hosts refuse HEAD; confirm with GET before calling a link broken.
    return head === 403 || head === 405 || head >= 500 ? attempt("GET") : head;
  };
  // GitHub answers a burst from a CI runner with 504s and 429s that clear
  // within seconds, so retry those twice with a growing pause.
  let code = await once();
  for (const wait of [3_000, 9_000]) {
    if (code !== 429 && code < 500) break;
    await new Promise((resolve) => setTimeout(resolve, wait));
    code = await once();
  }
  return code;
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function pool<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: limit }, worker));
}

async function main() {
  const links = collectLinks(join(import.meta.dirname, "..", "content"));
  const unique = [...new Map(links.map((l) => [l.url, l])).values()];
  const failures: string[] = [];

  await pool(unique, 4, async (link) => {
    if (!isAllowedHost(link.url)) {
      failures.push(`${link.url} (${link.where}): host not on the allow-list`);
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
  });

  if (failures.length) {
    console.error(
      `Broken or disallowed links:\n  - ${failures.sort().join("\n  - ")}`,
    );
    process.exit(1);
  }
  console.log(`links ok: ${unique.length} checked`);
}

if (import.meta.main) await main();
