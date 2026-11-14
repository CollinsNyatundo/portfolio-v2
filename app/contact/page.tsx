import type { Metadata } from "next";
import { Colophon } from "@/components/colophon";
import { ContactForm } from "@/components/contact-form";
import { CopyEmail } from "@/components/copy-email";
import { CvLink } from "@/components/cv-link";
import { Folio } from "@/components/folio";
import { site } from "@/content/site";
import { projects, publishedCaseStudies } from "@/lib/content";
import { contactMailto, contactTopic } from "@/lib/contact";
import { contactFormEnabled } from "@/lib/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Email Collins Nyagaka, AI and machine-learning engineer in Nairobi (UTC+3), open to remote roles.",
  alternates: { canonical: "/contact" },
};

function External({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex min-h-11 items-center"
    >
      {children}
      <span aria-hidden="true">&nbsp;↗</span>
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

const h2 = "font-display text-xl leading-snug";

/** Contact (docs/03 §2, docs/04 §7). Email first (D-27). */
export default async function ContactPage({
  searchParams,
}: PageProps<"/contact">) {
  const topic = contactTopic(
    (await searchParams).topic,
    publishedCaseStudies(),
    projects,
  );

  return (
    <>
      <Folio title="Contact" currentPath="/contact" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Contact
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-xl">
            {topic ? (
              <>
                You&apos;d like a walkthrough of{" "}
                <span className="font-medium">{topic.title}</span>. Email me and
                I&apos;ll set one up.
              </>
            ) : (
              <>
                The quickest way to reach me is email. {site.availabilityNote}.
              </>
            )}
          </p>

          <section
            aria-labelledby="email"
            className="bg-surface border-border mt-8 rounded-[2px] border p-6"
          >
            <h2 id="email" className={h2}>
              Email
            </h2>
            <p className="font-display mt-3 text-2xl [overflow-wrap:anywhere] lg:text-3xl">
              <a href={contactMailto(topic)}>{site.primaryActionLabel}</a>{" "}
              <span className="text-muted font-sans text-xl font-normal">
                at {site.email}
              </span>
            </p>
            <div className="mt-4">
              <CopyEmail email={site.email} />
            </div>
          </section>

          {contactFormEnabled() && (
            <section
              aria-labelledby="form"
              className="bg-surface border-border mt-8 rounded-[2px] border p-6"
            >
              <h2 id="form" className={h2}>
                Or send a message
              </h2>
              <div className="mt-4">
                <ContactForm
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  email={site.email}
                  defaultTopic={topic ? "walkthrough" : "general"}
                />
              </div>
            </section>
          )}

          <dl className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="bg-surface border-border rounded-[2px] border p-5">
              <dt className={h2}>Time zone</dt>
              <dd className="mt-2 font-serif">
                {site.location}, {site.utcOffsetLabel} (EAT). I reply within 2
                working days.
              </dd>
            </div>
            <div className="bg-surface border-border rounded-[2px] border p-5">
              <dt className={h2}>Availability</dt>
              <dd className="mt-2 font-serif">{site.availabilityNote}.</dd>
            </div>
            <div className="bg-surface border-border rounded-[2px] border p-5">
              <dt className={h2}>Elsewhere</dt>
              <dd className="mt-2 flex flex-col font-sans text-sm">
                <External href={site.links.linkedin}>LinkedIn</External>
                <External href={site.links.github}>GitHub</External>
                <CvLink
                  from="contact"
                  className="inline-flex min-h-11 items-center"
                >
                  CV (PDF)
                </CvLink>
              </dd>
            </div>
          </dl>

          <section
            aria-labelledby="freelance"
            className="bg-surface border-border mt-8 rounded-[2px] border p-6"
          >
            <h2 id="freelance" className={h2}>
              Freelance or company work?
            </h2>
            <p className="mt-2 max-w-[62ch] font-serif">
              Projects for businesses go through my company,{" "}
              <External href={site.links.company}>TundoTech Systems</External>.
            </p>
          </section>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
