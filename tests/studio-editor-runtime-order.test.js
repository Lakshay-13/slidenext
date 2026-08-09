const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor identity constants are initialized before controller wiring', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideAttributeDeclaration = source.indexOf("const EDITOR_SLIDE_ID_ATTR = 'data-slide-id';");
  const persistenceControllerWiring = source.indexOf(
    'const studioEditorPersistenceController ='
  );

  assert.ok(slideAttributeDeclaration >= 0);
  assert.ok(persistenceControllerWiring >= 0);
  assert.ok(slideAttributeDeclaration < persistenceControllerWiring);
  assert.equal(source.includes('\n          clearHistoryStacks,\n'), false);
  assert.match(source, /clearHistoryStacks:\s*clearStudioHistoryStacks/);
});
