const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const pdfScript = require('../scripts/export-canonical-pdf.js');

function buildSmokeDeck() {
  return {
    metadata: { title: 'PDF export smoke' },
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'title',
        type: 'text',
        tagName: 'h1',
        text: 'PDF export smoke',
        layout: { x: 100, y: 100, width: 800, height: 120 }
      }]
    }]
  };
}

test('canonical PDF HTML uses the canonical renderer and print contract', () => {
  const html = pdfScript.buildCanonicalPdfHtml(buildSmokeDeck(), 'http://127.0.0.1:1234/assets/');

  assert.match(html, /data-slidenext-pdf-print="true"/);
  assert.match(html, /<section[^>]*class="[^"]*slide/);
  assert.match(html, /<h1[^>]*>PDF export smoke<\/h1>/);
  assert.match(html, /<base href="http:\/\/127\.0\.0\.1:1234\/assets\/">/);
  assert.match(html, /@page[\s\S]*size: 1920px 1080px/);
});

test('canonical PDF input validation rejects malformed and empty decks', () => {
  assert.throws(
    () => pdfScript.resolveCanonicalDeck({ slides: [] }),
    /Cannot export an empty deck/
  );
  assert.throws(
    () => pdfScript.resolveCanonicalDeck({ metadata: {} }),
    /valid canonical deck/
  );
});

test('canonical PDF artifact validation enforces the one-page-per-slide contract', () => {
  const artifact = Buffer.from('%PDF-1.7\n/Type /Page\n/Type /Page\n', 'latin1');

  assert.equal(pdfScript.countPdfPages(artifact), 2);
  assert.equal(pdfScript.validatePdfArtifact(artifact, 2).pageCount, 2);
  assert.throws(
    () => pdfScript.validatePdfArtifact(artifact, 1),
    /PDF slide count mismatch: expected 1, found 2/
  );
});

test('createPdfAssetExists resolves local asset paths within the export roots', async () => {
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-pdf-assets-'));
  const assetDir = path.join(temporaryDir, 'assets');
  const assetPath = path.join(assetDir, 'hero.png');
  try {
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(assetPath, 'asset', 'utf8');
    const assetExists = pdfScript.createPdfAssetExists(temporaryDir, temporaryDir);

    assert.equal(assetExists('assets/hero.png'), true);
    assert.equal(assetExists('assets/missing.png'), false);
    assert.equal(assetExists('../outside.png'), false);
    assert.equal(assetExists('data:image/png;base64,AAAA'), true);
  } finally {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
});

test('canonical PDF CLI produces a real multi-page PDF with headless Chrome', { skip: !pdfScript.resolveChromeExecutable() }, async () => {
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-pdf-test-'));
  const inputPath = path.join(temporaryDir, 'deck.json');
  const outputPath = path.join(temporaryDir, 'deck.pdf');
  const deck = buildSmokeDeck();
  deck.slides.push({
    id: 'slide-2',
    nodes: [{
      id: 'second-title',
      type: 'text',
      tagName: 'h1',
      text: 'Second slide',
      layout: { x: 100, y: 100, width: 800, height: 120 }
    }]
  });

  try {
    await fs.writeFile(inputPath, `${JSON.stringify(deck)}\n`, 'utf8');
    assert.equal(await pdfScript.main([inputPath, outputPath]), 0);
    const pdfBuffer = await fs.readFile(outputPath);
    assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdfScript.countPdfPages(pdfBuffer), 2);
  } finally {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
});

test('canonical PDF buffer export reuses the temporary asset server and returns a valid artifact', { skip: !pdfScript.resolveChromeExecutable() }, async () => {
  const pdfBuffer = await pdfScript.exportCanonicalPdfBuffer(buildSmokeDeck());

  assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-');
  assert.equal(pdfScript.countPdfPages(pdfBuffer), 1);
  assert.equal(pdfBuffer.length > 1000, true);
});
