const test = require('node:test');
const assert = require('node:assert/strict');

const slideEditableElementsAdapter = require('../shared/studio-editor-slide-editable-elements-adapter.js');

test('getStudioEditorSlideEditableElements delegates the slide and options', () => {
  const slide = { id: 'slide-1' };
  const domOptions = { selectableSelector: '[data-editor-id]' };
  let delegated = null;

  const result = slideEditableElementsAdapter.getStudioEditorSlideEditableElements(slide, {
    domApi: {
      getStudioSlideEditableElements(slideValue, optionsValue) {
        delegated = { slideValue, optionsValue };
        return ['element-1'];
      }
    },
    domOptions
  });

  assert.deepEqual(result, ['element-1']);
  assert.equal(delegated.slideValue, slide);
  assert.equal(delegated.optionsValue, domOptions);
});

test('slide editable-element adapter prefers an explicit reader', () => {
  const options = {
    domApi: {
      getStudioSlideEditableElements() {
        throw new Error('DOM reader fallback should not run');
      }
    },
    slideEditableElementsReader: () => ['explicit-element'],
    domOptions: {}
  };

  assert.deepEqual(
    slideEditableElementsAdapter.getStudioEditorSlideEditableElements({}, options),
    ['explicit-element']
  );
});

test('slide editable-element adapter fails closed without the requested operation', () => {
  assert.deepEqual(
    slideEditableElementsAdapter.getStudioEditorSlideEditableElements({}),
    []
  );
});
