const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridgeApi = require('../shared/studio-editor-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor state bridge composes stores and delegates editor state access', () => {
  const stores = {
    presentationMetadataStateStore: {
      getPresentationMetadata: () => ({ title: 'Demo' }),
      setPresentationMetadata: (value) => value
    },
    presentationLabelStateStore: {
      getTitle: () => 'Demo',
      setTitle: (value) => value,
      getCategory: () => 'Research',
      setCategory: (value) => value
    },
    slideIndexStore: {
      getSlideIndex: () => 2,
      setSlideIndex: (value) => value,
      getSlideId: () => 'slide-2',
      setSlideId: (value) => value
    },
    selectionStateStore: {
      getSelectedElements: () => ['one', 'two'],
      getSelectedElement: () => 'one',
      getSelectedElementIds: () => ['node-1', 'node-2'],
      setState: (value) => value,
      clear: () => true,
      getPreserveSelectionOnNextActiveSlideSync: () => true,
      setPreserveSelectionOnNextActiveSlideSync: (value) => value
    }
  };
  const runtimeApi = {
    createStudioEditorStateRuntime(options) {
      assert.equal(options.presentationMetadataApi.name, 'metadata-api');
      assert.equal(options.presentationLabelApi.name, 'label-api');
      assert.equal(options.slideIndexApi.name, 'slide-api');
      assert.equal(options.selectionApi.name, 'selection-api');
      return stores;
    }
  };

  const bridge = bridgeApi.createStudioEditorStateBridge({
    runtimeApi,
    presentationMetadataApi: { name: 'metadata-api' },
    presentationLabelApi: { name: 'label-api' },
    slideIndexApi: { name: 'slide-api' },
    selectionApi: { name: 'selection-api' }
  });

  assert.deepEqual(bridge.getPresentationMetadata(), { title: 'Demo' });
  assert.deepEqual(bridge.setPresentationMetadata({ title: 'Next' }), { title: 'Next' });
  assert.equal(bridge.getTitle(), 'Demo');
  assert.equal(bridge.setTitle('Next'), 'Next');
  assert.equal(bridge.getCategory(), 'Research');
  assert.equal(bridge.setCategory('Product'), 'Product');
  assert.equal(bridge.getSlideIndex(), 2);
  assert.equal(bridge.setSlideIndex(3), 3);
  assert.equal(bridge.getSlideId(), 'slide-2');
  assert.equal(bridge.setSlideId('slide-3'), 'slide-3');
  assert.deepEqual(bridge.getSelectedElements(), ['one', 'two']);
  assert.equal(bridge.getSelectedElement(), 'one');
  assert.deepEqual(bridge.getSelectedElementIds(), ['node-1', 'node-2']);
  assert.deepEqual(bridge.setSelectionState({ selectedElements: ['three'] }), {
    selectedElements: ['three']
  });
  assert.equal(bridge.clearSelectionState(), true);
  assert.equal(bridge.getPreserveSelectionOnNextActiveSlideSync(), true);
  assert.equal(bridge.setPreserveSelectionOnNextActiveSlideSync(false), false);
});

test('editor state bridge preserves existing safe fallbacks without a runtime', () => {
  const bridge = bridgeApi.createStudioEditorStateBridge({ runtimeApi: null });

  assert.equal(bridge.runtime, null);
  assert.equal(bridge.getPresentationMetadata(), null);
  assert.equal(bridge.setPresentationMetadata({}), null);
  assert.equal(bridge.getTitle(), '');
  assert.equal(bridge.setTitle(''), false);
  assert.equal(bridge.getCategory(), '');
  assert.equal(bridge.setCategory(''), false);
  assert.equal(bridge.getSlideIndex(), 0);
  assert.equal(bridge.setSlideIndex(1), false);
  assert.equal(bridge.getSlideId(), '');
  assert.equal(bridge.setSlideId('slide-1'), false);
  assert.deepEqual(bridge.getSelectedElements(), []);
  assert.equal(bridge.getSelectedElement(), null);
  assert.deepEqual(bridge.getSelectedElementIds(), []);
  assert.equal(bridge.setSelectionState({}), false);
  assert.equal(bridge.clearSelectionState(), false);
  assert.equal(bridge.getPreserveSelectionOnNextActiveSlideSync(), false);
  assert.equal(bridge.setPreserveSelectionOnNextActiveSlideSync(true), false);
});

test('editor loads the editor state bridge after its runtime dependency', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorShellStateRuntimeAccessorsApi\s*\.\s*createStudioEditorShellStateRuntimeAccessors\(/
  );
  assert.match(fileContent, /studioEditorStateBridge/);
});
