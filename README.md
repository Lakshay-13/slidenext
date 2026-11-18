# SlideNext

<p align="center">
  <img src="logo.png" alt="SlideNext" width="180" />
</p>

SlideNext is a local-first, HTML-based presentation editor. Create slides with web technologies, open them in a slide-focused visual editor, and export them to PowerPoint or PDF.

The idea is to let you ask an LLM to draft a presentation as a designed web page, then refine the result with familiar slide-editing controls. SlideNext does **not** include an LLM or generate slide content; use the model or authoring tool of your choice to create the HTML.

## How it works

1. Create a presentation in HTML and CSS, by hand or with an external LLM.
2. Add its folder to `presentations/` and register it in `presentations/presentations.json`.
3. Open the deck in SlideNext to select, move, resize, arrange, and edit supported slide content. Use the HTML/CSS source editor when you want to work directly with the markup or styles.
4. Export the deck as a PDF or a best-effort editable PowerPoint file.

SlideNext keeps the HTML deck as the working document. It imports slide content into an internal canonical model for visual editing and export. Browser-specific effects and complex CSS may not map exactly to PowerPoint, so review exported files before sharing them.

## Features

- Presentation library with categories and a blank-deck workflow
- Visual slide canvas with selection, drag and resize, multi-selection, layers, layout controls, and snapping
- Slide add, duplicate, delete, reorder, and thumbnail organizer
- HTML and CSS source editing
- Autosave, undo and redo, and named version checkpoints with restore
- PDF export rendered through Chromium
- PowerPoint export that maps supported text, images, shapes, and layouts to editable slide elements

## Run locally

Requirements: Node.js 20 or newer. PDF export and HTML-to-slide import use Google Chrome or Chromium. Set `SLIDENEXT_CHROME_PATH` if the browser is not in a standard location.

```bash
npm install
npm start
```

Then open [http://localhost:11004](http://localhost:11004).

To run with Docker Compose:

```bash
docker compose up --build
```

The supplied Docker image installs Chromium and Poppler for browser-based exports.

## Add an HTML presentation

Create a folder under `presentations/`, for example:

```text
presentations/product-launch/
  index.html
  styles.css
  app.js
```

Add a matching entry to `presentations/presentations.json`:

```json
{
  "id": "product-launch",
  "title": "Product Launch",
  "description": "A short product introduction.",
  "folder": "product-launch",
  "icon": "rocket",
  "tags": ["Product", "Launch"]
}
```

Refresh the app and open the deck from the presentation library. Keep the slide structure in the HTML and its visual design in CSS where practical. Imported decks with custom scripts or advanced browser effects may need source-level adjustments before editing or exporting.

## Export and validation

The Studio export buttons create PDF and PPTX files. The command-line exporters are also available:

```bash
npm run export:pdf -- <deck.html-or-canonical-json> <output.pdf>
npm run export:pptx -- <deck.html-or-canonical-json> <output.pptx>
```

Run the automated suite with:

```bash
node --test tests/*.test.js
```

In this checkout, the full suite passes **4,711 tests**. The recorded end-to-end Docker and browser verification is in [TEST_FINDINGS.md](TEST_FINDINGS.md); that report is dated 2026-09-21 and records all nine findings as resolved.

## Project status and security

SlideNext is a working prototype and is intended for local use. Its Express server has no authentication and exposes APIs that can save and restore files in the project workspace. Do not expose port `11004` to an untrusted network or deploy this server publicly without adding appropriate access controls.

## Project structure

- `index.html` — dashboard and Studio interface
- `server.js` — local server, presentation storage, versioning, and export APIs
- `presentations/` — example HTML decks and presentation catalog
- `shared/` — editor, canonical deck, import, persistence, and export modules
- `scripts/` — PDF, PPTX, import, and verification commands
- `tests/` — automated unit and regression tests

## Tech stack

Node.js, Express, HTML, CSS, JavaScript, Chromium, and PptxGenJS.
