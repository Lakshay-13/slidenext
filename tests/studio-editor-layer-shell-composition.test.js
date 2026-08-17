const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-layer-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer shell composition wires accessor and global APIs', () => {
  const accessors = { updateLayersList() {} };
  const globalApi = { updateLayersList() {} };
  const controller = { id: 'controller' };
  const deckMutationApi = { id: 'deck-mutation' };
  const mutationApi = { id: 'mutation' };
  let accessorOptions = null;
  let globalOptions = null;

  const result = composition.createStudioEditorLayerShellComposition({
    accessorsApi: {
      createStudioEditorLayerAccessors(options) {
        accessorOptions = options;
        return accessors;
      },
      createStudioEditorLayerGlobalApi(options) {
        globalOptions = options;
        return globalApi;
      }
    },
    controller,
    deckMutationApi,
    mutationApi,
    documentRef: { id: 'document' },
    getIframeDoc: () => ({ id: 'iframe-document' }),
    getSelectedElements: () => [],
    layerOrderApi: { id: 'layer-order' }
  });

  assert.equal(result.accessors, accessors);
  assert.equal(result.globalApi, globalApi);
  assert.equal(accessorOptions.controller, controller);
  assert.equal(accessorOptions.deckMutationApi, deckMutationApi);
  assert.equal(accessorOptions.mutationApi, mutationApi);
  assert.equal(accessorOptions.documentRef.id, 'document');
  assert.equal(accessorOptions.layerOrderApi.id, 'layer-order');
  assert.equal(globalOptions.accessors, accessors);
});

test('layer shell composition fails closed without shared accessors', () => {
  assert.deepEqual(
    composition.createStudioEditorLayerShellComposition({ accessorsApi: null }),
    { accessors: null, globalApi: {} }
  );
});

test('index routes layer assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const accessorsScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-layer-accessors.js"></script>'
  );
  const compositionScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-layer-shell-composition.js"></script>'
  );

  assert.ok(accessorsScriptIndex >= 0);
  assert.ok(compositionScriptIndex > accessorsScriptIndex);
  assert.match(source, /studioEditorLayerShellCompositionApi/);
  assert.match(source, /createStudioEditorLayerShellComposition/);
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorLayerAccessors\.createStudioEditorLayerAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorLayerAccessors\.createStudioEditorLayerGlobalApi\(/
  );
});
