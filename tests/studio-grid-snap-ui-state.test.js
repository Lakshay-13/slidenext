const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('grid snap editor wiring delegates state ownership to the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-grid-snap-controller\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /getGridSizePx: \(\) => studioEditorGridSnapController/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorGridSnapShellRuntime\.createStudioEditorGridSnapShellRuntime\(/
  );
  assert.doesNotMatch(fileContent, /let isGridSnapEnabled = false/);
});
