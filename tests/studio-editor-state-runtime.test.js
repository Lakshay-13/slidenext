const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stateRuntime = require('../shared/studio-editor-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('state runtime composes metadata, label, slide, and selection stores', () => {
  const calls = [];
  const stores = {
    presentationMetadataStateStore: { name: 'metadata' },
    presentationLabelStateStore: { name: 'label' },
    slideIndexStore: { name: 'slide-index' },
    selectionStateStore: { name: 'selection' }
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });
  const getElementId = (element) => element.id;

  assert.deepEqual(
    stateRuntime.createStudioEditorStateRuntime({
      presentationMetadataApi: api(
        'metadata',
        'createStudioEditorPresentationMetadataStateStore',
        stores.presentationMetadataStateStore
      ),
      presentationLabelApi: api(
        'label',
        'createStudioEditorPresentationLabelStateStore',
        stores.presentationLabelStateStore
      ),
      slideIndexApi: api(
        'slide-index',
        'createStudioEditorSlideIndexStore',
        stores.slideIndexStore
      ),
      selectionApi: api(
        'selection',
        'createStudioEditorSelectionStateStore',
        stores.selectionStateStore
      ),
      getElementId
    }),
    stores
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'metadata',
    'label',
    'slide-index',
    'selection'
  ]);
  assert.deepEqual(calls[2][1], { initialSlideIndex: 0 });
  assert.equal(calls[3][1].getElementId, getElementId);
});

test('index wires basic editor state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-state-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorShellStateRuntimeAccessorsApi\s*\.\s*createStudioEditorShellStateRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPresentationMetadataStateStore\.createStudioEditorPresentationMetadataStateStore\(\{\}/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSelectionStateStore\.createStudioEditorSelectionStateStore\(\{\}/
  );
});
