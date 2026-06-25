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

test('resetStudioDeckUiState clears stale sidebar chrome for loading and idle states', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioDeckUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioDeckUiState(options = {}) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    slideCountLabel: { textContent: '5 / 12' },
    thumbnailsList: { innerHTML: '<div>Old thumbnails</div>' },
    slideLayersList: { innerHTML: '<div>Old layers</div>' }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioDeckUiStateSource, context);

  context.resetStudioDeckUiState({ isLoading: true });
  assert.equal(elements.slideCountLabel.textContent, '0 / 0');
  assert.match(elements.thumbnailsList.innerHTML, /Loading slides\.\.\./);
  assert.match(elements.slideLayersList.innerHTML, /Loading layers\.\.\./);

  context.resetStudioDeckUiState();
  assert.equal(elements.slideCountLabel.textContent, '0 / 0');
  assert.match(elements.thumbnailsList.innerHTML, /No slides loaded/);
  assert.match(elements.slideLayersList.innerHTML, /No active slide/);
});
