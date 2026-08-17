const test = require('node:test');
const assert = require('node:assert/strict');
const fsSync = require('node:fs');
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
    assert.equal(assetExists('assets/hero.png?v=2#hero'), true);
    assert.equal(assetExists('assets/missing.png'), false);
    assert.equal(assetExists('../outside.png'), false);
    assert.equal(assetExists('data:image/png;base64,AAAA'), true);
  } finally {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
});

test('legacy PDF helpers count slide classes and enforce workspace boundaries', () => {
  const html = '<section class="slide active"></section><div class="slide"></div><div class="not-slide"></div>';
  assert.equal(pdfScript.countLegacyHtmlSlides(html), 2);
  assert.equal(pdfScript.countLegacyHtmlSlides(html, '.frame'), 0);
  assert.equal(
    pdfScript.resolveLegacyHtmlSourcePath('presentations/onboarding-presentation/index.html').endsWith(
      path.join('presentations', 'onboarding-presentation', 'index.html')
    ),
    true
  );
  assert.equal(pdfScript.resolveLegacyHtmlSourcePath('../outside.html'), '');
});

test('legacy PDF CLI resolves the HTML sibling of a metadata-only sidecar', () => {
  assert.equal(
    pdfScript.resolveLegacyHtmlSiblingPath(
      path.join(__dirname, '..', 'presentations', 'onboarding-presentation', 'presentation.json')
    ).endsWith(path.join('onboarding-presentation', 'index.html')),
    true
  );
});

test('legacy PDF CLI accepts a direct HTML deck path', { skip: !pdfScript.resolveChromeExecutable() }, async () => {
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-direct-html-pdf-'));
  const inputPath = path.join(temporaryDir, 'deck.html');
  const outputPath = path.join(temporaryDir, 'deck.pdf');
  await fs.writeFile(
    inputPath,
    '<!doctype html><html><head><style>.slide{width:640px;height:360px;page-break-after:always}</style></head><body><section class="slide">Direct HTML</section></body></html>',
    'utf8'
  );

  try {
    assert.equal(await pdfScript.main([inputPath, outputPath]), 0);
    const pdfBuffer = await fs.readFile(outputPath);
    assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdfScript.countPdfPages(pdfBuffer), 1);
  } finally {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
});

test('legacy PDF CLI preserves one page per slide for every bundled deck', { skip: !pdfScript.resolveChromeExecutable() }, async () => {
  const presentationsDir = path.join(__dirname, '..', 'presentations');
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-bundled-pdf-'));
  const entries = await fs.readdir(presentationsDir, { withFileTypes: true });
  const deckPaths = entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => path.join(presentationsDir, entry.name, 'index.html'))
    .filter(inputPath => {
      try {
        return fsSync.statSync(inputPath).isFile();
      } catch (error) {
        return false;
      }
    });

  try {
    assert.ok(deckPaths.length > 0);
    for (const inputPath of deckPaths) {
      const html = await fs.readFile(inputPath, 'utf8');
      const expectedSlideCount = pdfScript.countLegacyHtmlSlides(html);
      const outputPath = path.join(temporaryDir, `${path.basename(path.dirname(inputPath))}.pdf`);

      assert.ok(expectedSlideCount > 0, `${inputPath} has no legacy slides`);
      assert.equal(await pdfScript.main([inputPath, outputPath]), 0);
      const pdfBuffer = await fs.readFile(outputPath);
      assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-', inputPath);
      assert.equal(pdfScript.countPdfPages(pdfBuffer), expectedSlideCount, inputPath);
    }
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
