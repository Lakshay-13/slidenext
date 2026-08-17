const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const verifyRealDecks = require('../scripts/verify-real-decks.js');

test('discoverPresentationDecks returns sorted deck descriptors and ignores hidden folders', async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-deck-discovery-'));
  await fs.mkdir(path.join(workspaceRoot, 'presentations', 'zeta'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'presentations', 'alpha'), { recursive: true });
  await fs.mkdir(path.join(workspaceRoot, 'presentations', '.versions'), { recursive: true });

  const descriptors = await verifyRealDecks.discoverPresentationDecks(workspaceRoot);

  assert.deepEqual(descriptors.map((descriptor) => descriptor.id), ['alpha', 'zeta']);
  assert.equal(
    descriptors[0].htmlPath,
    path.join(workspaceRoot, 'presentations', 'alpha', 'index.html')
  );
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

test('formatVerificationReport summarizes artifact counts and warnings', () => {
  const report = verifyRealDecks.formatVerificationReport([
    {
      id: 'demo',
      slideCount: 3,
      pdfPages: 3,
      pptxSlides: 3,
      pdfWarnings: ['one'],
      pptxWarnings: ['two'],
      canonicalSlideCount: 3,
      canonicalPdfPages: 3,
      canonicalPptxSlides: 3,
      canonicalPdfWarnings: ['three'],
      canonicalPptxWarnings: []
    }
  ]);

  assert.equal(
    report,
    'Verified 1 real deck(s):\n- demo: 3 slide(s), 3 PDF page(s), 3 PPTX slide(s), 2 legacy warning(s); canonical: 3 slide(s), 3 PDF page(s), 3 PPTX slide(s), 1 warning(s)'
  );
});

test('buildCanonicalImportHarnessHtml loads the importer and targets the requested deck', () => {
  const source = verifyRealDecks.buildCanonicalImportHarnessHtml('/presentations/demo/index.html');

  assert.match(source, /id="canonical-deck-output"/);
  assert.match(source, /src="\/shared\/deck-import\.js"/);
  assert.match(source, /src="\/presentations\/demo\/index\.html"/);
  assert.match(source, /canonicalImportReady/);
});
