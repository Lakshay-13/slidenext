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

test('resetStudioPresentationUiState clears stale preview chrome and exits fullscreen for the modal', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioPresentationUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioPresentationUiState() {',
    '\n\n    function closePresentation() {'
  );

  const elements = {
    presentationModal: {
      classList: createClassList(['active', 'opacity-100'])
    },
    presentationFrame: {
      __slideNextPreviewLoadToken: 1,
      onload: () => {},
      src: '/presentations/stale/index.html',
      srcdoc: '<html>stale preview</html>',
      removeAttribute() {}
    },
    fsIcon: {
      textContent: 'fullscreen_exit'
    }
  };

  let exitFullscreenCalls = 0;
  const documentStub = {
    body: {
      style: {
        overflow: 'hidden'
      }
    },
    fullscreenElement: elements.presentationModal,
    getElementById(id) {
      return elements[id] || null;
    },
    exitFullscreen() {
      exitFullscreenCalls += 1;
      this.fullscreenElement = null;
      return Promise.resolve();
    }
  };

  const context = {
    SlideNextStudioPreview: preview,
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioPresentationUiStateSource, context);

  context.resetStudioPresentationUiState();

  assert.equal(exitFullscreenCalls, 1);
  assert.equal(documentStub.fullscreenElement, null);
  assert.equal(elements.presentationFrame.onload, null);
  assert.equal(elements.presentationFrame.src, '');
  assert.equal(elements.presentationFrame.srcdoc, '');
  assert.equal(elements.presentationModal.classList.contains('active'), false);
  assert.equal(elements.presentationModal.classList.contains('hidden'), true);
  assert.equal(elements.presentationModal.classList.contains('opacity-0'), true);
  assert.equal(elements.presentationModal.classList.contains('pointer-events-none'), true);
  assert.equal(elements.presentationModal.classList.contains('opacity-100'), false);
  assert.equal(documentStub.body.style.overflow, '');
  assert.equal(elements.fsIcon.textContent, 'fullscreen');
});
