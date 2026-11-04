/**
 * Site identity (docs/05-CONTENT-SCHEMA.md §2, `site`).
 * Copy rules: plain English, no em dashes in visible text (docs/04 §1).
 */

export type Availability = "open" | "selective" | "closed";

export const site = {
  name: "Collins Nyagaka",
  fullName: "Collins Nyatundo Nyagaka",
  title: "AI & Machine Learning Engineer",
  location: "Nairobi, Kenya",
  timeZone: "Africa/Nairobi",
  utcOffsetLabel: "UTC+3",
  availability: "open" as Availability,
  availabilityNote: "Open to remote AI and ML engineering roles",
  email: "cnyagakan@gmail.com",
  links: {
    linkedin: "https://www.linkedin.com/in/collinsnyagaka001/",
    github: "https://github.com/CollinsNyatundo",
    company: "https://tundotechsystems.com",
  },
  cvPath: "/cv/Collins_Nyagaka_CV.pdf",
  showPhone: false,
  /**
   * The one sentence on the title page (BRIEF: "believe by the end").
   * No figures here: numbers live in the evidence ledger with their sources.
   */
  positioning:
    "I build ML and LLM systems that hold up under honest evaluation, from fraud models tested on future data to legal search that refuses to guess.",
  /** The single primary action label, used everywhere (D-27). */
  primaryActionLabel: "Email Collins",
} as const;

export const mailtoHref = `mailto:${site.email}?subject=${encodeURIComponent(
  "Opportunity for Collins Nyagaka",
)}`;
