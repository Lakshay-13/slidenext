const test = require('node:test');
const assert = require('node:assert/strict');

const slideEditableElementsAccessors = require('../shared/studio-editor-slide-editable-elements-accessors.js');

test('slide editable-element accessors resolve the DOM adapter and shared options', () => {
  const calls = [];
  const slide = { id: 'slide-1' };
  const domApi = { name: 'dom-api' };
  const accessors = slideEditableElementsAccessors
    .createStudioEditorSlideEditableElementsAccessors({
      slideEditableElementsAdapter: {
        getStudioEditorSlideEditableElements(slideValue, options) {
          calls.push([slideValue, options]);
          return ['element-1'];
        }
      },
      domApi,
      getDomOptions: (overrides = {}) => ({
        selectableSelector: '[data-editor-id]',
        ...overrides
      })
    });

  assert.deepEqual(
    accessors.getSlideEditableElements(slide, { includeHidden: true }),
    ['element-1']
  );
  assert.deepEqual(calls, [[slide, {
    domApi,
    domOptions: {
      selectableSelector: '[data-editor-id]',
      includeHidden: true
    }
  }]]);
});

test('slide editable-element accessors fail closed when the adapter is unavailable', () => {
  const accessors = slideEditableElementsAccessors
    .createStudioEditorSlideEditableElementsAccessors({
      slideEditableElementsAdapter: null
    });

  assert.deepEqual(accessors.getSlideEditableElements({}), []);
});
