const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('index loads the canonical reader composition before the editor inline wiring', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptIndex = fileContent.indexOf('/shared/studio-editor-canonical-reader-composition.js');
  const inlineIndex = fileContent.indexOf('const studioEditorCanonicalReaderCompositionApi =');

  assert.ok(scriptIndex >= 0);
  assert.ok(inlineIndex > scriptIndex);
});

test('index routes canonical visibility and freeform reads through the composition', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /getStudioEditorCanonicalVisibilityReader\(property, doc, fallback\)/);
  assert.match(fileContent, /getStudioEditorCanonicalFreeformReader\(doc, fallback\)/);
});

test('index does not retain a second inline canonical reader implementation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const readerStart = fileContent.indexOf(
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {'
  );
  const readerEnd = fileContent.indexOf(
    '\n\n    const studioEditorElementHiddenWriter =',
    readerStart
  );

  assert.ok(readerStart >= 0);
  assert.ok(readerEnd > readerStart);
  const readerSource = fileContent.slice(readerStart, readerEnd);
  assert.doesNotMatch(readerSource, /studioEditorCanonicalReaderResolvers\.getStudioEditorCanonical/);
  assert.doesNotMatch(readerSource, /canonicalReaderAdapter\.getStudioEditorCanonical/);
});
