const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const overlayShellRuntime = require('../shared/studio-editor-selection-overlay-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('selection overlay shell runtime creates a shared synchronizer and forwards documents', () => {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const overlayApi = {
    createStudioSelectionOverlaySynchronizer(options) {
      calls.push(options);
      return (doc) => ({
        doc,
        activeSlide: options.getActiveSlide(doc),
        selectedElements: options.getSelectedElements(doc)
      });
    }
  };
  const runtime = overlayShellRuntime.createStudioEditorSelectionOverlayShellRuntime({
    overlayApi,
    overlayStateApi: { name: 'overlay-state' },
    getActiveSlide: (doc) => ({ doc }),
    getSelectedElements: () => ['element-1']
  });

  assert.deepEqual(runtime.sync(documentRef), {
    doc: documentRef,
    activeSlide: { doc: documentRef },
    selectedElements: ['element-1']
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].overlayStateApi.name, 'overlay-state');
});

test('selection overlay shell runtime fails closed when the shared overlay is unavailable', () => {
  const runtime = overlayShellRuntime.createStudioEditorSelectionOverlayShellRuntime({
    overlayApi: null
  });

  assert.equal(runtime.sync({}), false);
});

test('index routes selection overlay synchronization through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-selection-overlay-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionOverlayShellRuntimeApi\.createStudioEditorSelectionOverlayShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionOverlaySynchronizer = studioEditorSelectionOverlayShellRuntime/
  );
});
