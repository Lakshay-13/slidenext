const test = require('node:test');
const assert = require('node:assert/strict');

const presentationCreation = require('../shared/presentation-creation.js');
const pptxExport = require('../shared/canonical-pptx-export.js');
const pdfScript = require('../scripts/export-canonical-pdf.js');

function buildBlankDeck() {
  const artifacts = presentationCreation.buildBlankPresentationArtifacts({
    title: 'New deck export acceptance'
  });
  assert.ok(artifacts);
  assert.ok(artifacts.canonicalDeck);
  return artifacts.canonicalDeck;
}

test('blank canonical deck exports to a valid generalized PPTX', async () => {
  const result = pptxExport.createCanonicalPptxExport(buildBlankDeck());
  const buffer = await result.pptx.write({ outputType: 'nodebuffer' });

  assert.equal(result.slideCount, 1);
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  assert.equal(pptxExport.countPptxSlides(buffer), 1);
  assert.equal(pptxExport.validatePptxArtifact(buffer, 1).length, buffer.length);
});

test('blank canonical deck exports to one-page PDF', {
  skip: !pdfScript.resolveChromeExecutable()
}, async () => {
  const buffer = await pdfScript.exportCanonicalPdfBuffer(buildBlankDeck());

  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.equal(pdfScript.countPdfPages(buffer), 1);
});
