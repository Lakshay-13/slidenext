const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-state-accessors.js');

test('state accessors delegate metadata, labels, slide index, and selection state', () => {
  const bridge = {
    getPresentationMetadata: () => ({ title: 'Demo' }),
    setPresentationMetadata: (value) => value,
    getTitle: () => 'Demo',
    setTitle: (value) => value,
    getCategory: () => 'Research',
    setCategory: (value) => value,
    getSlideIndex: () => 2,
    setSlideIndex: (value) => value,
    getSlideId: () => 'slide-2',
    setSlideId: (value) => value,
    getSelectedElements: () => ['stale'],
    getSelectedElementIds: () => ['node-1'],
    setSelectionState: (value) => value,
    clearSelectionState: () => true,
    getPreserveSelectionOnNextActiveSlideSync: () => true,
    setPreserveSelectionOnNextActiveSlideSync: (value) => value
  };
  const currentElement = { id: 'current', isConnected: true };
  const accessors = accessorsApi.createStudioEditorStateAccessors({
    bridge,
    getActiveSlide: () => ({ contains: (element) => element === currentElement }),
    getElementById: () => currentElement
  });

  assert.deepEqual(accessors.getPresentationMetadata(), { title: 'Demo' });
  assert.equal(accessors.setPresentationMetadata({ title: 'Next' }).title, 'Next');
  assert.equal(accessors.getTitle(), 'Demo');
  assert.equal(accessors.setTitle('Next'), 'Next');
  assert.equal(accessors.getCategory(), 'Research');
  assert.equal(accessors.setCategory('Product'), 'Product');
  assert.equal(accessors.getSlideIndex(), 2);
  assert.equal(accessors.setSlideIndex(3), 3);
  assert.equal(accessors.getSlideId(), 'slide-2');
  assert.equal(accessors.setSlideId('slide-3'), 'slide-3');
  assert.deepEqual(accessors.getSelectedElements({}), [currentElement]);
  assert.equal(accessors.getSelectedElement({}), currentElement);
  assert.deepEqual(accessors.getSelectedElementIds(), ['node-1']);
  assert.deepEqual(accessors.setSelectionState({ selectedElements: [] }), {
    selectedElements: []
  });
  assert.equal(accessors.clearSelectionState(), true);
  assert.equal(accessors.getPreserveSelectionOnNextActiveSlideSync(), true);
  assert.equal(accessors.setPreserveSelectionOnNextActiveSlideSync(false), false);
});

test('state accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorStateAccessors();

  assert.equal(accessors.getPresentationMetadata(), null);
  assert.equal(accessors.setPresentationMetadata({}), null);
  assert.equal(accessors.getTitle(), '');
  assert.equal(accessors.setTitle(''), false);
  assert.equal(accessors.getCategory(), '');
  assert.equal(accessors.setCategory(''), false);
  assert.equal(accessors.getSlideIndex(), 0);
  assert.equal(accessors.setSlideIndex(1), false);
  assert.equal(accessors.getSlideId(), '');
  assert.equal(accessors.setSlideId('slide-1'), false);
  assert.deepEqual(accessors.getSelectedElements(), []);
  assert.equal(accessors.getSelectedElement(), null);
  assert.deepEqual(accessors.getSelectedElementIds(), []);
  assert.equal(accessors.setSelectionState({}), false);
  assert.equal(accessors.clearSelectionState(), false);
  assert.equal(accessors.getPreserveSelectionOnNextActiveSlideSync(), false);
  assert.equal(accessors.setPreserveSelectionOnNextActiveSlideSync(true), false);
});

test('state global api preserves metadata, label, and slide-index shell names', () => {
  const calls = [];
  const accessors = {
    getPresentationMetadata: () => ({ title: 'Demo' }),
    setPresentationMetadata: (value) => {
      calls.push(['metadata', value]);
      return value;
    },
    getTitle: () => 'Demo',
    setTitle: (value) => value,
    getCategory: () => 'Research',
    setCategory: (value) => value,
    getSlideIndex: () => 2,
    setSlideIndex: (value) => value,
    getSlideId: () => 'slide-2',
    setSlideId: (value) => value
  };
  const globalApi = accessorsApi.createStudioEditorStateGlobalApi({ accessors });

  assert.deepEqual(globalApi.getStudioCurrentPresentationMetadata(), { title: 'Demo' });
  assert.deepEqual(
    globalApi.setStudioCurrentPresentationMetadata({ title: 'Next' }),
    { title: 'Next' }
  );
  assert.equal(globalApi.getStudioPresentationTitle(), 'Demo');
  assert.equal(globalApi.setStudioPresentationTitle('Next'), 'Next');
  assert.equal(globalApi.getStudioPresentationCategory(), 'Research');
  assert.equal(globalApi.setStudioPresentationCategory('Product'), 'Product');
  assert.equal(globalApi.getStudioCurrentSlideIndex(), 2);
  assert.equal(globalApi.setStudioCurrentSlideIndex(3), 3);
  assert.equal(globalApi.getStudioCurrentSlideId(), 'slide-2');
  assert.equal(globalApi.setStudioCurrentSlideId('slide-3'), 'slide-3');
  assert.deepEqual(calls, [['metadata', { title: 'Next' }]]);
});

test('state accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorStateAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorStateAccessors
      .createStudioEditorStateAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorStateAccessors
      .createStudioEditorStateGlobalApi,
    'function'
  );
});

test('editor loads state accessors after the state bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.stateAccessors/);
  assert.match(fileContent, /studioEditorStateAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorStateGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioCurrentPresentationMetadata\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioPresentationTitle\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioCurrentSlideIndex\(\)/);
});
