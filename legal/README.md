# Legal documents — MixLabs Studio

Drafts, not filed law. **Have a lawyer review these before you rely on them.**
Two things in particular need professional eyes, because they're specific to
this business rather than boilerplate:

1. **Cross-border transfer.** An Indian company processing customer data on US
   infrastructure (Backblaze `us-east-005`, Supabase, Vercel, Resend). India's
   DPDP Rules govern this and the detail matters.
2. **Custody of unreleased footage.** The liability and confidentiality clauses
   here are the ones that would actually be tested if a film leaked. Generic
   SaaS terms don't contemplate holding someone's unreleased feature.

## What's here

| File | Purpose | Required? |
|---|---|---|
| `privacy-policy.md` | What data you hold and why | **Yes — legally** |
| `terms-of-service.md` | The contract with customers | Not by statute, but essential |
| `subprocessors.md` | Third parties touching customer data | Yes, under GDPR/DPDP |
| `dpa.md` | Data Processing Addendum for B2B clients | On request, expect it from studios |

## Placeholders to fill before publishing

Every `[SQUARE BRACKET]` is a decision, not a formatting artifact:

- `Mixlabs Creative Private Limited` — the registered company, not the brand
- `M/26, Housing Colony, Bariatu, Ranchi, Jharkhand 834009, India`
- `info@mixlabscreative.com` — a monitored address; `privacy@mixlabscreative.com` is fine
- `India` / `Ranchi, Jharkhand` — see the note in terms-of-service.md
- `18 August 2026`

## Keeping them honest

These describe how the app actually behaves today. If that changes, the
documents are wrong until updated — and a privacy policy that misdescribes your
processing is worse than not having one, because it's a representation you've
published. Revisit whenever you add a subprocessor, start analytics, or change
what you retain.
