import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { site } from "@/content/site";

const BUILD_DATE = "2026-11-03";

/**
 * Milestone 1 placeholder for the title page. The chaptered home page
 * (Problem, Method, Work, Demo, Colophon) is built in M3 from the scroll-craft
 * BRIEF in design/scrollcraft/builds/portfolio-home/.
 */
export default function Home() {
  return (
    <>
      <Folio title="Title page" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-24 lg:pt-40">
          <h1 className="max-w-[12ch] font-serif text-[3.5rem] leading-[0.98] font-medium tracking-[-0.025em] sm:text-[5rem] lg:text-[7rem]">
            {site.name}
          </h1>
          <p className="text-muted mt-8 font-sans text-base font-medium tracking-tight lg:text-lg">
            {site.title}
          </p>
          {site.positioning && (
            <p className="mt-6 max-w-[62ch] text-xl lg:text-2xl">
              {site.positioning}
            </p>
          )}
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated={BUILD_DATE} />
        </div>
      </div>
    </>
  );
}
