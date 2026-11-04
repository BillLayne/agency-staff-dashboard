# Agency Staff Dashboard

## November 4, 2026: Home declarations reader

Live release: staff deployment `b08242bc` / asset `index-1LARpH5K.js` from `3c7286e`; agent deployment `5169bb9d` / asset `index-BNthzEyK.js` from `C:/Users/bill/cmp-home-dec`. Both versions passed 89 tests and build. Fictional photo and multi-page PDF checks exercised the real reader, and browser tests covered address handoff, unverified document labeling, property-record conflicts, existing-draft protection and responsive layout. Live tests passed sign-in, same-origin/input protection, property lookup and staff document permissions. A physical phone camera was not exercised; no customer documents were used.

Home Quote Info includes **Read declarations** for camera capture or PDF/JPG/PNG/WebP up to 8 MB. The signed, same-origin endpoint sends the file to Gemini for transcription and extraction without saving the original. Staff review the property address and details before applying to empty fields; a different property or named insured cannot replace an existing draft. On a new draft, the confirmed address starts the existing Find My Home lookup. Policy-sourced answers remain labeled unverified and separate from public records in the interview, saved drafts, and report. The reader does not infer claims, insurance status, roof age from year built, or current-policy limits/dates from a renewal. Property matching still requires staff verification.

## November 4, 2026: Auto declarations reader

Live release: staff deployment `63dde0fc` / asset `index-UD_DyCUS.js` from `5e7d988`; agent deployment `b67576a1` / asset `index-DUP9nYQH.js` from the isolated production baseline `C:/Users/bill/cmp-auto-dec`. Both versions passed 81 tests and build. Live synthetic photo and PDF endpoint checks passed, as did signed/same-origin/input protections and staff document permission checks. Browser checks covered review and filling on phone/desktop sizes, an excluded driver, multiple vehicles, and legacy draft protection. Phone camera hardware itself was not exercised; no customer documents were used.

Auto Quote Info offers **Read declarations**, with camera capture or PDF/JPG/PNG/WebP upload up to 8 MB. The signed, same-origin endpoint sends the selected file to Gemini for transcription and extraction, without saving the original. Staff review the extracted details and add only blank fields; existing answers are preserved, and a different or unidentifiable insured cannot be merged into an existing draft. Renewal source details do not become current-policy limits or expiration, missing history and consent are never filled, and a mailing address is not assumed to be a garaging address. Full VINs and deductible rows are kept only where supported; other details remain for staff review. The importer shares the auto draft's tab-scoped recovery and existing exports. The same files are intended for the agent Command Center.

## November 4, 2026: Command Center parity

Production release: commit `1a7aaf6`, Cloudflare Pages deployment `e2dd0c47`, live asset `index-D2Tk69V2.js`. Verified the separate staff sign-in, shared contacts (20 entries, revision 10 unchanged), both quote workspaces and live Lee property lookup, AI memo response, 320/390/1440 layouts, and staff document deletion/Gmail-draft restrictions. Tested old staff memo recovery with synthetic data. The image-host endpoint presented a Cloudflare challenge to both agent and staff automated checks, so image-library access remains unverified; the image-host access code is still required. No customer records or messages were changed.

The staff dashboard uses the current Agency Command Center design and search/tools workspaces, including Home Quote Info, Auto Quote Info and VIN lookup. It preserves the staff login, shared contacts database and its original contact storage keys, tab-scoped memo drafts including legacy recovery, staff-only launcher tools, and staff document-link restrictions. Staff do not receive Bill's Mail Gateway or the document-link delete and Gold Elite Gmail-draft permissions. The image workspace requires its own existing image-host access code. New quote drafts remain in the current browser tab or an explicitly downloaded file.

`APP_ID=agency-staff-dashboard` must remain set: it controls the staff session and server-side document capabilities. Do not deploy with the agent dashboard's configuration. AI requests use the server-side staff secret; no API key belongs in the frontend. Property research sends only the requested address to Find My Home. Source parity was based on the live agent release at `C:/Users/bill/cmp-home-quick`, not its unrelated undeployed main branch.

Separate staff-only dashboard for Bill Layne Insurance with Unified Search and three launcher sections:
- Operations
- Documents & Forms
- Property & Coverage

Unified Search includes the same 17-company built-in carrier and workers compensation directory used by the agent Agency Command Center. Staff can search, copy, add, edit, remove, back up, and restore contact details. Additions/corrections now sync through authenticated `/api/contacts` to a private Cloudflare D1 database shared with the agent dashboard. Offline changes remain queued; conflicting edits require review. Original browser contacts are retained and migrate only after a confirmed shared save. Private backups stay outside the public repository.

Historical note: the original staff dashboard excluded Gmail Engineering and image links. The current Images workspace retains the image host’s separate access-code requirement.

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

Third workspace mode, **Docs** (header switch + "Document Links" tile): upload a PDF, Word file or photo (up to 15 MB) and get a branded `https://docs.billlayneinsurance.com/d/<id>` link to text or email — no SMS conversation needed. Same tool as the Agency Command Center's Docs workspace; the files are identical copies of that repo's (`components/DocumentLinksCard.tsx`, `components/DocEmailDialog.tsx`, `shared/docLinks.ts`, `shared/docEmail.ts`, `services/docLinksClient.ts`, `services/mailGateway.ts`, `server/docLinks.ts`, `functions/api/doc-links/`, `tests/doc-links.test.mjs`, `tests/doc-email.test.mjs`) — change them there first, then copy. `scripts/preview-doc-links.mjs` is a staff variant (port 8789, `APP_ID` staff); port its fake-service changes by hand.

- Documents live in the SMS Command Center Worker and open on its existing customer page (PDF preview, Download, Share, Call/Text/Message). Text-message previews use the SAME picture as SMS document links; `public/doc-link-text-preview.jpg` is only a display copy.
- Browser → this dashboard's `/api/doc-links` Pages Functions (signed session + same-origin) → Worker with `DOC_LINK_TOKEN`, a **production-only** Pages secret scoped on the Worker to document routes only. Preview deployments deliberately have no token ("not set up").
- Uploads are tagged `staff-dashboard` server-side (from `APP_ID`), so the shared library shows a "Staff Dashboard" badge. The Library lists every document link (SMS, Command Center, Staff Dashboard).
- **Command Center only, decided server-side from `APP_ID=agency-staff-dashboard`:** *Delete* (`canDeleteDocLinks` — the staff proxy answers 403 and the UI hides the controls) and *Gold Elite Gmail drafts with the file attached* (`canGmailDraft` — the BLI Mail Gateway runs as Bill, so a staff draft would land in Bill's Drafts). Here, "Email" / "Email in Gmail" open a plain Gmail compose with the link instead. `DocEmailDialog` is compiled in only so the shared files stay identical; it never opens in this dashboard. `/api/doc-links/file` (signed session; streams the document so a draft can attach it) is wired here too but gives staff nothing new — they can already open every library link.
- **Automatic cleanup (2026-10-01):** the SMS Worker deletes a document link 90 days after the customer last opened it (90 days after it was made if never opened). Library rows show each date; the rule in `shared/docLinks.ts` (`autoDeleteAt`) mirrors the Worker.
- Docs stays mounted while hidden, so switching modes never interrupts an upload.
- Local check: `npm run build`, then `node --experimental-strip-types scripts/preview-doc-links.mjs` and open `http://localhost:8789/__preview-login` (real auth + proxy, fake document service, synthetic credentials).

## Release Procedure

Only publish after explicit authorization. Run lint, tests, build, then commit/push approved files and deploy with `npx wrangler pages deploy dist --project-name agency-staff-dashboard --branch main`. A Git push alone is not deployment.

For local full-stack checks, initialize local D1 with the migration and run `npx wrangler pages dev dist --port 8788` with private `.dev.vars`. A Vite-only preview does not test the Pages sign-in gate.

The companion agent repo provides `scripts/configure-pages.mjs`, `scripts/verify-deployment.mjs`, and `scripts/verify-contact-sync.mjs`. These read secrets from ignored local configuration without printing them. The last script is restricted to preview hosts. Both production bundles must remain free of keys and passwords.

Confirmed: synthetic contact/server regression tests, builds, TypeScript, zero dependency audit advisories, protected preview API checks, and bidirectional preview contact sync with stale-save rejection. No real customer messages/forms or live image uploads were submitted. See the agent repo's `RELEASE_2026_09_07.md` for the integrated UI review.
