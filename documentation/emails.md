# Transactional Emails

Only one feature sends email: the optional contact form (`POST /api/contact`). **The portfolio assistant (`POST /api/assistant`) sends zero emails and has zero email-sending capability.**

## Contact Form Delivery Path

- **Path:** `components/contact-form.tsx` -> `POST /api/contact` (`app/api/contact/route.ts`) -> Cloudflare Turnstile `siteverify` (`lib/contact-form.ts`) -> Resend REST API (`https://api.resend.com/emails`) -> owner inbox (`site.email`).
- **Configuration gate:** Disabled (`503`) unless `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, and `CONTACT_FROM_EMAIL` are all present.
- **Template & sanitization:** Plain text only (`text` payload, never HTML), topic mapped through allow-listed `CONTACT_TOPICS`, strict length caps (`name <= 100`, `email <= 254`, `message 20-2000`), zero PII stored server-side.
- **Retries & failures:** Single `8s` `AbortSignal.timeout` fetch with no background queue or retry storm; upstream failure returns generic `502 { error: "send_failed" }` and prompts visitor to email directly.
