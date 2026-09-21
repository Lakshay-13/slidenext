# SlideNext QA Findings

Date: 2026-09-21
Environment: Docker Compose, `presentation-hub`, `http://localhost:11004`
Scope: dashboard, deck launch, legacy presentation controls, Studio editor, versions, source editing, wallpaper, exports, API boundaries, responsive layout, and automated tests.

## Executive summary

The container started successfully and the backend/API contract is healthy. The original QA pass reproduced the following defects; the P1/P2 operational defects and production maintenance warnings were fixed and retested below. One non-blocking export-fidelity limitation remains documented.

1. Existing dashboard cards do not launch Preview or Studio Editor.
2. The three legacy interactive decks load but their JavaScript navigation and presentation actions do nothing.
3. PDF export fails because the container has no Chrome/Chromium; legacy-HTML PPTX export fails through the same PDF conversion path.
4. The Studio slide thumbnail organizer becomes out of sync after adding or duplicating slides.
5. Applying CSS-only source changes changes the editor layout status to `LAYOUT UNAVAILABLE`.
6. The Studio layout is clipped and difficult to use at a 640px-wide viewport.
7. Canonical PPTX export succeeds but reports 11 fidelity warnings for the tested deck.
8. The browser console reports the production Tailwind CDN warning.
9. Container build emits five npm audit vulnerabilities; the obsolete Compose schema warning was fixed.

## Fix iteration results

Each fix was followed by a targeted regression test and a live retest. The final status is:

| Finding | Status | Retest evidence |
| --- | --- | --- |
| F-001 dashboard card actions | Resolved | Fresh dashboard loaded all four catalog cards; `Launch Keynote` opened the preview modal and `Studio Editor` opened the selected deck. |
| F-002 legacy presentation initialization | Resolved | Onboarding advanced `01 / 12` → `02 / 12`; AI Tools advanced `01 / 07` → `02 / 07` and its entry action advanced; Computer Vision advanced `01 / 20` → `02 / 20`. |
| F-003 PDF/PPTX export unavailable in Docker | Resolved | Container now has Chromium and Poppler. Legacy PDF and PPTX API calls returned HTTP 200; PDF was valid and PPTX passed `unzip -t`. Canonical PDF/PPTX also returned valid artifacts. Legacy PPTX remains intentionally flattened and reports its warning. |
| F-004 slide organizer refresh | Resolved | Live Studio mutation kept counter and thumbnails aligned: `12 / 12` → `13 / 13` after Add, then `14 / 14` after Duplicate. |
| F-005 CSS-only layout state | Resolved | Blank canonical deck showed `Freeform canvas` before and after CSS-only Apply, with `data-layout-mode=absolute`. |
| F-006 narrow Studio layout | Resolved | Real Chrome at 640×720 stacked organizer, canvas, and inspector; toolbar wrapped; document horizontal scroll width stayed within the viewport. |
| F-007 canonical PPTX fidelity warnings | Remaining limitation | Export succeeds and ZIP integrity passes, but the tested complex deck still reports fidelity warnings for unsupported gradients, missing exportable bounds, and non-exportable background URLs. |
| F-008 Tailwind CDN warning | Resolved | Local generated stylesheet is served on all production pages; fresh browser tabs report no warning. |
| F-009 build/dependency warnings | Resolved | Compose `version` warning removed; both `npm audit` modes report 0 vulnerabilities. |

The final automated run completed with **4,710 passed, 0 failed** tests. The suite includes the new regressions for ready-state initialization, thumbnail refresh, canonical layout preservation, responsive compatibility, export behavior, and local stylesheet asset resolution.

## Final live verification

- Docker Compose: `presentation_hub_editor` remained running on `0.0.0.0:11004`.
- Catalog: `/api/presentations` returned exactly the four shipped decks; the temporary QA deck was absent.
- Legacy PDF: `/api/export/pdf` for onboarding returned HTTP 200, `application/pdf`, warning count `0`, and a valid 8-page PDF.
- Legacy PPTX: `/api/export/pptx` for onboarding returned HTTP 200, the OpenXML content type, warning count `1` for intentional flattening, and passed `unzip -t`.
- Dashboard: onboarding Preview opened `presentations/onboarding-presentation/index.html`; Studio opened the same deck and showed `Structured layout`.
- Legacy browser controls: onboarding advanced `01 / 12` → `02 / 12`; AI Tools advanced `01 / 07` → `02 / 07`; Computer Vision advanced `01 / 20` → `02 / 20`.
- Browser console: no runtime errors or Tailwind production warnings were observed in fresh dashboard and legacy-deck tabs.

The automated suite passed all 4,710 tests. API validation, version create/rename/restore/delete, security boundary checks, theme/category controls, new-deck validation, preview keyboard navigation, and canonical PPTX ZIP integrity also passed.

## Reproduced findings

### F-001 — Existing dashboard actions are no-ops [P1]

Area: Dashboard library

Steps:

1. Open `http://localhost:11004` in a fresh browser tab.
2. On an existing deck card, click `Launch Keynote`.
3. Repeat with `Studio Editor`.

Expected:

- `Launch Keynote` opens the presentation preview modal and loads the selected deck.
- `Studio Editor` opens the selected deck in SlideNext Studio.

Observed:

- Neither click changes the page.
- Preview remains hidden: `opacity-0 pointer-events-none`, no iframe source.
- Studio remains hidden: `opacity-0 pointer-events-none`, no iframe source.

The direct static deck URLs do load, so this is specifically a failure in the dashboard card action path. The header `New Deck` flow does open Studio, which makes the inconsistency more apparent: newly created decks can be opened, while existing catalog decks cannot.

### F-002 — Legacy presentation JavaScript does not initialize [P1]

Affected decks tested directly:

- `presentations/ai-tools-presentation/index.html` — 7 slides
- `presentations/onboarding-presentation/index.html` — 12 slides
- `presentations/computer-vision-presentation/index.html` — 20 slides

Steps:

1. Navigate directly to each deck URL under port 11004.
2. Confirm the first slide and counter render.
3. Click the visible `Next` control; also test the visible entry/action control on the AI Tools deck.

Expected:

- The next control advances the active slide and updates the counter.
- Deck-specific controls such as `Enter Workshop` execute their advertised action.

Observed for all three decks:

- The deck HTML and slide content render successfully.
- The active slide remains index 0.
- The counter remains `01 / N` after clicking `#nextBtn`.
- `window.goToSlide` is `undefined` after the page reaches `readyState=complete`.
- The AI Tools `Enter Workshop` action is also a no-op.

This is not limited to the external GSAP dependency: the onboarding deck has the same navigation failure without relying on GSAP. The loaded `app.js` files are served with HTTP 200 and pass `node --check`, so the live bootstrap/event wiring needs investigation.

Impact: users can see the first slide of these presentations but cannot navigate or use the interactive presentation content.

### F-003 — PDF export and legacy-HTML PPTX export fail in the container [P1]

Steps:

1. Use the Studio PDF export action.
2. Call `POST /api/export/pdf` with a valid canonical deck.
3. Call `POST /api/export/pptx` with a legacy HTML source deck.

Observed:

- Studio status changes to `PDF EXPORT FAILED`.
- The exact error is: `Failed to export PDF: Google Chrome or Chromium is required for PDF export`.
- The canonical PDF API response is HTTP 500 with the same error.
- Legacy-HTML PPTX export also returns HTTP 500 with the same error because that path uses PDF conversion.

The Docker image is Node 20 Alpine and does not install Chrome or Chromium. Canonical-deck PPTX export is a separate path and does succeed, so the failure is specific to the browser/PDF-dependent export paths.

### F-004 — Slide organizer is out of sync after add/duplicate [P2]

Area: Studio slide management

Steps:

1. Open a new blank deck in Studio.
2. Click `Add New Slide`.
3. Duplicate a slide.

Observed:

- Immediately after `Add New Slide`, the counter reports `2 / 2`, but the thumbnail organizer still contains only one thumbnail.
- Immediately after duplication, the counter reports `3 / 3`, the canvas contains three slides, but the organizer contains only two thumbnail cards.
- A later full source refresh causes the missing thumbnails to appear.

Impact: the user can have a valid slide on the canvas that is not selectable from the organizer, and the organizer count does not match the visible cards.

### F-005 — CSS-only source Apply reports the layout as unavailable [P2]

Area: Studio source editor

Steps:

1. Open the source editor for the test deck.
2. Switch to CSS.
3. Add only a CSS comment: `/* QA source apply probe */`.
4. Apply the source without changing the deck structure.

Observed:

- The slide thumbnails refresh, including thumbnails that were missing after slide insertion.
- The editor layout badge changes from `FREEFORM CANVAS` to `LAYOUT UNAVAILABLE` after this CSS-only apply.

Expected: a CSS-only change should preserve the existing recognized layout mode. This may be a state rehydration or canonical-deck detection regression.

### F-006 — Studio is not usable at a narrow viewport [P2]

Viewport tested: 640x720.

Observed:

- The fixed three-column Studio layout compresses the canvas between the side panels.
- Toolbar controls on the right are clipped off-screen.
- The slide organizer and inspector consume most of the available width, leaving the canvas too narrow for practical editing.

The dashboard itself collapses to a usable one-column card layout at this width, so the issue is specific to the editor's responsive behavior.

### F-007 — Canonical PPTX export completes with 11 fidelity warnings [P3]

The canonical deck export API returned HTTP 200 and produced a valid ZIP/PPTX artifact. `unzip -t` reported no errors.

The response included `X-SlideNext-Pptx-Warning-Count: 11`. The Studio status showed warnings including:

- slide background image is not an exportable image URL;
- nodes without exportable bounds.

This is not an export failure, but the generated deck may differ materially from the HTML editor view. The warning count and warning details should be surfaced clearly to users and ideally tied to the affected slides/elements.

### F-008 — Tailwind CDN production warning [P3] — Resolved

The browser console reports:

`cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI.`

Resolution:

- Replaced the runtime CDN script with the checked-in `shared/tailwind.generated.css` build on the dashboard and all three legacy presentation pages.
- Added a `npm run build:css` regeneration path and a compatibility test that rejects CDN references in production pages.
- Fresh browser checks no longer report the Tailwind production warning.

### F-009 — Container/dependency build warnings [P3] — Resolved

The container startup/build emits two maintenance warnings:

- Docker Compose reports that `docker-compose.yml` uses the obsolete top-level `version: '3.8'` attribute and ignores it.
- npm install reported 5 vulnerabilities: 3 moderate and 2 high.

Resolution:

- The obsolete Compose `version` attribute was removed.
- Express dependency updates resolved the `body-parser`, `express`, and `qs` advisories.
- `image-size` is pinned to `2.0.4` through the npm override used by `pptxgenjs`, resolving the remaining high advisory.
- Both `npm audit` and `npm audit --omit=dev` now report 0 vulnerabilities.

## Passed checks

- `docker compose up -d --build` completed; container stayed up and served port 11004.
- `GET /`, `GET /api/presentations`, catalog deck HTML, logos, and `presentations.json` returned HTTP 200.
- Dashboard category filtering separated the Research deck from General decks.
- Dashboard light/dark theme toggle changed the document theme and body background.
- Empty new-deck submission displayed `Presentation title is required`.
- New-deck creation opened Studio and created the expected folder and metadata.
- Studio preview opened, and preview `ArrowRight` keyboard navigation changed the active slide.
- Named version create, rename, restore, and delete succeeded; restore returned the HTML byte-for-byte to the saved state.
- Single-slide wallpaper application changed the active slide background as expected.
- Canonical PPTX export returned HTTP 200, a ZIP-valid artifact, and the expected warning header.
- API boundary checks rejected missing parameters, traversal paths, invalid canonical decks, and outside-workspace saves/restores with 400/403 responses.
- Node test suite: 4,710 passed, 0 failed after the fixes.

## Test artifacts and cleanup

The temporary deck `qa-fix-css-regression-20260921` was removed from the catalog and moved recoverably to `/tmp/slidenext-qa-fix-css-regression-20260921-20260921`. The onboarding HTML and metadata changed by the slide-mutation probe were backed up to `/tmp/slidenext-qa-mutated-onboarding-*` and restored to repository state. Existing unrelated dirty files were preserved.
