const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('syncStudioEditorLayoutModeControl delegates to the shared layout mode controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const start = fileContent.indexOf('function syncStudioEditorLayoutModeControl(doc = getIframeDoc()) {');
  const end = fileContent.indexOf('\n\n    function bindDeckNavigationSync', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = fileContent.slice(start, end);
  const calls = [];
  const context = {
    studioEditorLayoutModeController: {
      sync(doc) {
        calls.push(doc);
        return 'layout-result';
      }
    },
    getIframeDoc() {
      return { id: 'default-document' };
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  const sourceDoc = { id: 'source-document' };
  assert.equal(context.syncStudioEditorLayoutModeControl(sourceDoc), 'layout-result');
  assert.deepEqual(calls, [sourceDoc]);
});
