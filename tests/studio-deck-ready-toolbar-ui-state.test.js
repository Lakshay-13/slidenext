const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('updateDeckReadyToolbarActionState enables save and source actions only when the iframe document is ready', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false }
  };
  const context = {
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);

  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, true);

  context.updateDeckReadyToolbarActionState({ documentElement: {} });
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
});
