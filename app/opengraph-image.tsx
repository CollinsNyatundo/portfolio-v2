import { site } from "@/content/site";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = `${site.name}, ${site.title}, ${site.location}`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({
    eyebrow: "Portfolio",
    title: site.name,
    body: site.positioning,
  });
}
