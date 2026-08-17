const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const inspectorShellRuntime = require('../shared/studio-editor-inspector-selection-shell-runtime.js');
const inspectorAccessors = require('../shared/studio-editor-inspector-selection-accessors.js');

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

test('inspector selection accessors compose the shell runtime and preserve its sync contract', () => {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const runtimeApi = {
    createStudioEditorInspectorSelectionShellRuntime(options) {
      calls.push(options);
      return { sync: (doc) => doc === documentRef ? 'synced' : false };
    }
  };
  const accessors = inspectorAccessors.createStudioEditorInspectorSelectionAccessors({
    runtimeApi,
    inspectorApi: { name: 'inspector' },
    liveSelectionApi: { name: 'live-selection' },
    inspectorView: { name: 'inspector-view' },
    documentRef,
    getSelectedElements: () => ['element-1']
  });

  assert.equal(accessors.sync(documentRef), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].inspectorApi.name, 'inspector');
  assert.equal(calls[0].liveSelectionApi.name, 'live-selection');
  assert.equal(calls[0].inspectorView.name, 'inspector-view');
  assert.equal(calls[0].documentRef, documentRef);
});

test('inspector selection accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = inspectorAccessors.createStudioEditorInspectorSelectionAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.sync({}), false);
});

test('index routes inspector selection synchronization through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-inspector-selection-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-inspector-selection-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorInspectorSelectionCompositionApi[\s\S]*createStudioEditorInspectorSelectionComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorInspectorSelectionSynchronizer = studioEditorInspectorSelectionComposition/
  );
});
