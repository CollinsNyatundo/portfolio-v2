import Image from "next/image";
import { getBenchObject } from "@/content/objects";

export interface BenchObjectProps {
  slug: string;
  alt?: string;
  priority?: boolean;
}

export function BenchObject({ slug, alt, priority = false }: BenchObjectProps) {
  const entry = getBenchObject(slug);

  if (entry?.exists) {
    return (
      <div className="bg-surface-2 relative aspect-[4/5] w-full overflow-hidden rounded-[2px]">
        <Image
          src={`/images/objects/${entry.slug}.avif`}
          alt={alt ?? entry.alt}
          width={800}
          height={1000}
          preload={priority}
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 45vw, 92vw"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      data-bench-object={slug}
      className="bg-surface-2 border-border/70 aspect-[4/5] w-full rounded-[2px] border shadow-[inset_0_2px_6px_rgba(0,0,0,0.14)]"
    />
  );
}
