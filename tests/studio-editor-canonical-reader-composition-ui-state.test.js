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
