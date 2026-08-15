const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const canvasShellRuntime = require('../shared/studio-editor-canvas-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('canvas shell runtime uses the shared synchronizer with call-time deck and zoom state', () => {
  const calls = [];
  const canvasApi = {
    createStudioCanvasDimensionsSynchronizer(options) {
      calls.push(options);
      return () => ({
        documentRef: options.getDocumentRef(),
        canonicalDeck: options.getCanonicalDeck(),
        zoomFactor: options.getZoomFactor()
      });
    }
  };
  const documentRef = { id: 'editor-document' };
  const canonicalDeck = { kind: 'slidenext.deck' };
  const runtime = canvasShellRuntime.createStudioEditorCanvasShellRuntime({
    canvasApi,
    getDocumentRef: () => documentRef,
    getCanonicalDeck: () => canonicalDeck,
    getZoomFactor: () => 0.75
  });

  assert.deepEqual(runtime.sync(), {
    documentRef,
    canonicalDeck,
    zoomFactor: 0.75
  });
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].getDocumentRef, 'function');
});

test('canvas shell runtime falls back to the shared apply API when no synchronizer exists', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const canvasApi = {
    applyStudioCanvasDimensions(options) {
      calls.push(options);
      return { didApply: true };
    }
  };
  const runtime = canvasShellRuntime.createStudioEditorCanvasShellRuntime({
    canvasApi,
    getDocumentRef: () => documentRef,
    getCanonicalDeck: () => {
      throw new Error('deck unavailable');
    },
    getZoomFactor: () => 1.25
  });

  assert.deepEqual(runtime.sync(), { didApply: true });
  assert.deepEqual(calls, [{
    documentRef,
    canonicalDeck: null,
    zoomFactor: 1.25
  }]);
});

test('index routes canvas sizing through the shared shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canvas-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorCanvasShellRuntimeApi\.createStudioEditorCanvasShellRuntime\(/
  );
  assert.match(
    fileContent,
    /return studioEditorCanvasShellRuntime\.sync\(\);/
  );
});
