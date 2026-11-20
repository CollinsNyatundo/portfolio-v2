import corpusJson from "../../content/.generated/assistant-corpus.json" with { type: "json" };
import type { AssistantCorpus, CorpusChunk, FactUnit } from "./types.ts";

const corpus = corpusJson as unknown as AssistantCorpus;

const chunkMap = new Map<string, CorpusChunk>(
  corpus.chunks.map((c) => [c.id, c]),
);
const factMap = new Map<string, FactUnit>(corpus.facts.map((f) => [f.id, f]));
const routeSet = new Set<string>(corpus.routeRegistry);
const entitySet = new Set<string>(corpus.entitySlugs);
const manifestChunks = corpus.manifestChunkIds
  .map((id) => chunkMap.get(id))
  .filter((c): c is CorpusChunk => Boolean(c));

export function getCorpus(): AssistantCorpus {
  return corpus;
}

export function getChunk(id: string): CorpusChunk | undefined {
  return chunkMap.get(id);
}

export function getFact(id: string): FactUnit | undefined {
  return factMap.get(id);
}

export function isVerifiedRoute(route: string): boolean {
  return routeSet.has(route);
}

export function isKnownEntitySlug(slug: string): boolean {
  return entitySet.has(slug);
}

export function getManifestChunks(): CorpusChunk[] {
  return manifestChunks;
}
