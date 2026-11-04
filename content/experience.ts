import type { Certification, Experience } from "./schema.ts";

/**
 * Roles, newest first (D-16). Employer roles list generic duties only (D-20).
 * Wording matches the CV in public/cv/.
 */
export const experience: Experience[] = [
  {
    org: "FlyRank AI",
    role: "Backend AI Engineer (Intern)",
    type: "internship",
    start: "2026-10",
    end: "present",
    location: "Remote",
    remote: true,
    bullets: [
      "Building AI backend services: retrieval-augmented generation, structured outputs, tool-calling agents and evaluation, with a focus on grounding, validation and failure handling.",
    ],
    visible: true,
  },
  {
    org: "Office of the Director of Public Prosecutions",
    role: "ICT Officer",
    type: "full-time",
    start: "2026-07",
    end: "present",
    location: "Kenya",
    remote: false,
    bullets: [
      "Support the security, reliability and backup of institutional systems and databases, and train users on them.",
    ],
    visible: true,
  },
  {
    org: "Independent (freelance and contract work)",
    role: "AI & ML Engineer",
    type: "freelance",
    start: "2022-05",
    end: "present",
    location: "Remote, Nairobi",
    remote: true,
    bullets: [
      "Built the backend of an AML/KYC transaction-monitoring prototype for Kenyan financial institutions: Kafka ingestion, 35 typology rules, a composite risk score and streaming anomaly detection.",
      "Built ETL pipelines in Python, Airflow and Kedro that prepare high-volume transaction data for modelling.",
    ],
    visible: true,
  },
  {
    org: "Lish AI Labs",
    role: "Data Scientist",
    type: "full-time",
    start: "2024-09",
    end: "2025-02",
    location: "Nakuru, Kenya",
    remote: true,
    bullets: [
      "Built and validated statistical and machine-learning models in Python and SQL with the risk and product teams for quarterly KPIs, and trained 10+ operators to act on the results through Tableau and Python dashboards.",
    ],
    visible: true,
  },
  {
    org: "Bloom Hospital Nakuru",
    role: "IT Technician (Intern)",
    type: "internship",
    start: "2024-10",
    end: "2024-11",
    location: "Nakuru, Kenya",
    remote: false,
    bullets: [
      "Supported the rollout of a new hospital management system, trained staff on it, and built a Power BI dashboard of insurance providers.",
    ],
    visible: true,
  },
  {
    org: "TELUS International",
    role: "Quality Analyst",
    type: "contract",
    start: "2022-10",
    end: "2022-12",
    location: "Remote",
    remote: true,
    bullets: [
      "Reviewed files against guideline documentation and masked personal data in images and documents.",
    ],
    visible: true,
  },
  {
    org: "Kenya Revenue Authority",
    role: "Intern",
    type: "internship",
    start: "2022-05",
    end: "2022-07",
    location: "Nakuru, Kenya",
    remote: false,
    bullets: [
      "Took part in risk profiling of cases for audit and in tax audits under the department's procedures.",
    ],
    visible: true,
  },
];

/** Degree and the certificates worth a recruiter's time (docs/05 §2). */
export const certifications: Certification[] = [
  {
    name: "Bachelor of Business and Information Technology",
    issuer: "Jomo Kenyatta University of Agriculture and Technology (JKUAT)",
    issued: "2023-12",
    kind: "degree",
  },
  {
    name: "Data Science",
    issuer: "Moringa School",
    issued: "2025",
    kind: "certificate",
  },
  {
    name: "Data Engineering",
    issuer: "Sankhyana Consultancy Services",
    issued: "2025-04",
    kind: "certificate",
  },
  {
    name: "Python Data Wrangling",
    issuer: "Great Learning",
    issued: "2025-01",
    kind: "certificate",
  },
  {
    name: "IBM Data Science Professional Certificate",
    issuer: "IBM",
    issued: "2024-07",
    kind: "certificate",
  },
  {
    name: "Complete A.I. & Machine Learning, Data Science Bootcamp",
    issuer: "Zero To Mastery Academy",
    issued: "2024-05",
    kind: "certificate",
  },
];
