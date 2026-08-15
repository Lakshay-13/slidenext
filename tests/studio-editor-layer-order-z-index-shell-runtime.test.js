const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const zIndexShellRuntime = require('../shared/studio-editor-layer-order-z-index-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer-order z-index shell runtime forwards canonical resolution callbacks', () => {
  const calls = [];
  const layerOrderApi = {
    createStudioLayerOrderZIndexInputSynchronizer(options) {
      calls.push(options);
      return (target) => ({ target, document: options.getDocument(target) });
    }
  };
  const target = { id: 'node-1' };
  const runtime = zIndexShellRuntime.createStudioEditorLayerOrderZIndexShellRuntime({
    layerOrderApi,
    getDocument: (sourceTarget) => ({ target: sourceTarget }),
    getDocumentRef: () => ({ id: 'editor-document' }),
    resolveCanonicalDeck: () => ({ kind: 'slidenext.deck' }),
    resolveCanonicalNode: () => ({ id: 'canonical-node' })
  });

  assert.deepEqual(runtime.sync(target), {
    target,
    document: { target }
  });
  assert.equal(runtime.isAvailable, true);
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].getDocument, 'function');
  assert.equal(typeof calls[0].getDocumentRef, 'function');
  assert.equal(typeof calls[0].resolveCanonicalDeck, 'function');
  assert.equal(typeof calls[0].resolveCanonicalNode, 'function');
});

test('layer-order z-index shell runtime fails closed when the shared layer-order API is unavailable', () => {
  const runtime = zIndexShellRuntime.createStudioEditorLayerOrderZIndexShellRuntime({
    layerOrderApi: null
  });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.sync, null);
});

test('index routes layer-order z-index synchronization through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-z-index-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorLayerOrderZIndexShellRuntimeApi\s*\.\s*createStudioEditorLayerOrderZIndexShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorLayerOrderZIndexSynchronizer = studioEditorLayerOrderZIndexShellRuntime/
  );
});
