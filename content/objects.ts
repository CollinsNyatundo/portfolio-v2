export type ObjectSlug =
  | "creditcard-fraud"
  | "legalai-kenya"
  | "complianceguard"
  | "geo-ai-cropland-mapping"
  | "production-ai-template"
  | "404";

export interface BenchObjectEntry {
  slug: ObjectSlug;
  alt: string;
  exists: boolean;
}

export const benchObjects: Record<ObjectSlug, BenchObjectEntry> = {
  "creditcard-fraud": {
    slug: "creditcard-fraud",
    alt: "Top-down photograph of a fan of blank payment cards, one set apart under a magnifier, on a grey workbench.",
    exists: true,
  },
  "legalai-kenya": {
    slug: "legalai-kenya",
    alt: "Top-down photograph of a stack of bound law reports with coloured page flags on a grey workbench.",
    exists: true,
  },
  complianceguard: {
    slug: "complianceguard",
    alt: "Top-down photograph of a keypad mobile phone beside a stack of coins and clipped paper slips on a grey workbench.",
    exists: true,
  },
  "geo-ai-cropland-mapping": {
    slug: "geo-ai-cropland-mapping",
    alt: "Top-down photograph of a printed false-colour satellite image of farm plots under a grid overlay, with a grease pencil, on a grey workbench.",
    exists: true,
  },
  "production-ai-template": {
    slug: "production-ai-template",
    alt: "Top-down photograph of a key cabinet tray of identical brass keys on coloured tags, one key lying apart, on a grey workbench.",
    exists: true,
  },
  "404": {
    slug: "404",
    alt: "Top-down photograph of an empty matte mid-grey workbench.",
    exists: true,
  },
};

export function getBenchObject(slug: string): BenchObjectEntry | undefined {
  return (benchObjects as Record<string, BenchObjectEntry | undefined>)[slug];
}
