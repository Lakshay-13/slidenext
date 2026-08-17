const test = require('node:test');
const assert = require('node:assert/strict');

const blankSlideAccessors = require('../shared/studio-editor-blank-slide-accessors.js');

test('blank-slide accessors resolve the DOM adapter and shared options', () => {
  const calls = [];
  const doc = { id: 'iframe-doc' };
  const domApi = { name: 'dom-api' };
  const accessors = blankSlideAccessors.createStudioEditorBlankSlideAccessors({
    blankSlideAdapter: {
      createStudioEditorBlankSlide(docValue, options) {
        calls.push([docValue, options]);
        return { id: 'slide-1' };
      }
    },
    domApi,
    getDomOptions: (overrides = {}) => ({
      slideClassName: 'slide',
      ...overrides
    })
  });

  assert.deepEqual(
    accessors.createBlankSlide(doc, { layout: 'blank' }),
    { id: 'slide-1' }
  );
  assert.deepEqual(calls, [[doc, {
    domApi,
    domOptions: {
      slideClassName: 'slide',
      layout: 'blank'
    }
  }]]);
});

test('blank-slide accessors fail closed when the adapter is unavailable', () => {
  const accessors = blankSlideAccessors.createStudioEditorBlankSlideAccessors({
    blankSlideAdapter: null
  });

  assert.equal(accessors.createBlankSlide({}), null);
});
