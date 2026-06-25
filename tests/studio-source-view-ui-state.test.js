const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const preview = require('../shared/studio-preview.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('resetStudioSourceViewUiState clears stale source modal chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioSourceViewUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioSourceViewUiState() {',
    '\n\n    // Sync fullscreen button icon when native fullscreen changes'
  );

  const elements = {
    sourceViewModal: {
      classList: createClassList(['opacity-100'])
    },
    sourceViewModalContent: {
      classList: createClassList(['scale-100'])
    },
    sourceViewContent: {
      value: '<html>stale source</html>',
      scrollTop: 24
    }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    SlideNextStudioPreview: preview,
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioSourceViewUiStateSource, context);

  context.resetStudioSourceViewUiState();

  assert.equal(elements.sourceViewContent.value, '');
  assert.equal(elements.sourceViewContent.scrollTop, 0);
  assert.equal(elements.sourceViewModal.classList.contains('hidden'), true);
  assert.equal(elements.sourceViewModal.classList.contains('opacity-0'), true);
  assert.equal(elements.sourceViewModal.classList.contains('opacity-100'), false);
  assert.equal(elements.sourceViewModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.sourceViewModalContent.classList.contains('scale-100'), false);
});
