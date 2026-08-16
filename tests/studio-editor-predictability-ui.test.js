const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const INDEX_HTML_PATH = require('node:path').join(__dirname, '..', 'index.html');

test('editor exposes the Shift resize aspect-ratio affordance', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /id="resizeAspectRatioHint"[\s\S]*?Hold\s+<kbd[^>]*>Shift<\/kbd>\s+while resizing to keep proportions\./
  );
});
