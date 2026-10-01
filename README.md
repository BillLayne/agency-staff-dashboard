# Agency Staff Dashboard

Separate staff-only dashboard for Bill Layne Insurance with Unified Search and three launcher sections:
- Operations
- Documents & Forms
- Property & Coverage

Unified Search includes the same 17-company built-in carrier and workers compensation directory used by the agent Agency Command Center. Staff can search, copy, add, edit, remove, back up, and restore contact details. Additions/corrections now sync through authenticated `/api/contacts` to a private Cloudflare D1 database shared with the agent dashboard. Offline changes remain queued; conflicting edits require review. Original browser contacts are retained and migrate only after a confirmed shared save. Private backups stay outside the public repository.

This app intentionally excludes Gmail Engineering and Quick Image Links / Imgur.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm test
npm run build
```

## September 7, 2026 Release

- Live: https://agency-staff-dashboard.pages.dev/
- Source: `C:\Users\bill\OneDrive\Documents\Playground\Agency-Staff-Dashboard`
- GitHub: https://github.com/BillLayne/agency-staff-dashboard
- Cloudflare Pages project: `agency-staff-dashboard`; configuration: `wrangler.jsonc`.
- Signed server sessions replace the public client access code. Configure private `SITE_PASSWORD` and `SESSION_SECRET`; missing configuration fails closed. `/login` and `/logout` manage the one-week HttpOnly/Secure session.
- New private login instructions: `../Agency-Staff-Contact-Backups/command-center-access-2026-09-07.txt`. Never publish its contents.
- Search AI requests go to authenticated `/api/ai`. `GEMINI_API_KEY` stays in Cloudflare, never in the bundle. The old key was invalid during review; successful live AI generation still needs Bill's valid replacement key. Drafts survive failures; clipboard failures are visible. Generated report HTML is sanitized before export.
- `CONTACTS_DB` binds to production `agency-shared-contacts`; preview uses separate `agency-shared-contacts-preview`. Do not run synthetic writes against production.
- Migration: `migrations/0001_shared_contacts.sql`; optimistic revision checks prevent silent overwrites, and the database retains prior versions for 90 days.
- Shared code: `server/auth.ts`, `server/contacts.ts`, `server/ai.ts`, `services/contactDirectory.ts`, `hooks/useCompanyContacts.ts`, and `components/ContactLookup.tsx`. Equivalent files exist in `Customer-Matrix-Pro`; keep contracts and validation aligned. The contact legacy storage key differs intentionally.
- Existing staff structure and launcher inventory remain unchanged. The No Loss quick action now matches the existing e-signature launcher destination.

## October 1, 2026: Document Links (Docs mode)

Third workspace mode, **Docs** (header switch + "Document Links" tile): upload a PDF, Word file or photo (up to 15 MB) and get a branded `https://docs.billlayneinsurance.com/d/<id>` link to text or email — no SMS conversation needed. Same tool as the Agency Command Center's Docs workspace; the files are identical copies of that repo's (`components/DocumentLinksCard.tsx`, `shared/docLinks.ts`, `services/docLinksClient.ts`, `server/docLinks.ts`, `functions/api/doc-links/`, `tests/doc-links.test.mjs`) — change them there first, then copy.

- Documents live in the SMS Command Center Worker and open on its existing customer page (PDF preview, Download, Share, Call/Text/Message). Text-message previews use the SAME picture as SMS document links; `public/doc-link-text-preview.jpg` is only a display copy.
- Browser → this dashboard's `/api/doc-links` Pages Functions (signed session + same-origin) → Worker with `DOC_LINK_TOKEN`, a **production-only** Pages secret scoped on the Worker to document routes only. Preview deployments deliberately have no token ("not set up").
- Uploads are tagged `staff-dashboard` server-side (from `APP_ID`), so the shared library shows a "Staff Dashboard" badge. The Library lists every document link (SMS, Command Center, Staff Dashboard).
- Docs stays mounted while hidden, so switching modes never interrupts an upload.
- Local check: `npm run build`, then `node --experimental-strip-types scripts/preview-doc-links.mjs` and open `http://localhost:8789/__preview-login` (real auth + proxy, fake document service, synthetic credentials).

## Release Procedure

Only publish after explicit authorization. Run lint, tests, build, then commit/push approved files and deploy with `npx wrangler pages deploy dist --project-name agency-staff-dashboard --branch main`. A Git push alone is not deployment.

For local full-stack checks, initialize local D1 with the migration and run `npx wrangler pages dev dist --port 8788` with private `.dev.vars`. A Vite-only preview does not test the Pages sign-in gate.

The companion agent repo provides `scripts/configure-pages.mjs`, `scripts/verify-deployment.mjs`, and `scripts/verify-contact-sync.mjs`. These read secrets from ignored local configuration without printing them. The last script is restricted to preview hosts. Both production bundles must remain free of keys and passwords.

Confirmed: synthetic contact/server regression tests, builds, TypeScript, zero dependency audit advisories, protected preview API checks, and bidirectional preview contact sync with stale-save rejection. No real customer messages/forms or live image uploads were submitted. See the agent repo's `RELEASE_2026_09_07.md` for the integrated UI review.
