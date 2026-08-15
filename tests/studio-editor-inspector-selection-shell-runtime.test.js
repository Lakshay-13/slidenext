const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const inspectorShellRuntime = require('../shared/studio-editor-inspector-selection-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('inspector selection shell runtime creates a shared synchronizer and forwards selection documents', () => {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const inspectorApi = {
    createStudioInspectorSelectionSynchronizer(options) {
      calls.push(options);
      return (doc) => ({
        doc,
        selectedElements: options.getSelectedElements(doc),
        canonicalDeck: options.buildCanonicalDeck(doc)
      });
    }
  };
  const runtime = inspectorShellRuntime.createStudioEditorInspectorSelectionShellRuntime({
    inspectorApi,
    liveSelectionApi: { name: 'live-selection' },
    inspectorView: { name: 'inspector-view' },
    documentRef,
    getSelectedElements: () => ['element-1'],
    buildCanonicalDeck: () => ({ kind: 'slidenext.deck' })
  });

  assert.deepEqual(runtime.sync(documentRef), {
    doc: documentRef,
    selectedElements: ['element-1'],
    canonicalDeck: { kind: 'slidenext.deck' }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].liveSelectionApi.name, 'live-selection');
  assert.equal(calls[0].inspectorView.name, 'inspector-view');
});

test('inspector selection shell runtime fails closed when the shared controller is unavailable', () => {
  const runtime = inspectorShellRuntime.createStudioEditorInspectorSelectionShellRuntime({
    inspectorApi: null
  });

  assert.equal(runtime.sync({}), false);
});

test('index routes inspector selection synchronization through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-inspector-selection-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorInspectorSelectionShellRuntimeApi\s*\.\s*createStudioEditorInspectorSelectionShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorInspectorSelectionSynchronizer = studioEditorInspectorSelectionShellRuntime/
  );
});
