const test = require('node:test');
const assert = require('node:assert/strict');

const slideIdAdapter = require('../shared/studio-editor-slide-id-adapter.js');

test('assignStudioEditorSlideId delegates the slide and options', () => {
  const slide = { id: 'slide-node' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  let delegated = null;

  const result = slideIdAdapter.assignStudioEditorSlideId(slide, {
    domApi: {
      assignStudioSlideId(slideValue, optionsValue) {
        delegated = { slideValue, optionsValue };
        return 'slide-1';
      }
    },
    domOptions
  });

  assert.equal(result, 'slide-1');
  assert.equal(delegated.slideValue, slide);
  assert.equal(delegated.optionsValue, domOptions);
});

test('assignStudioEditorSlideId prefers an explicit assigner', () => {
  assert.equal(
    slideIdAdapter.assignStudioEditorSlideId({}, {
      domApi: {
        assignStudioSlideId() {
          throw new Error('DOM API fallback should not run');
        }
      },
      slideIdAssigner: () => 'slide-2',
      domOptions: {}
    }),
    'slide-2'
  );
});

test('getStudioEditorSlideId delegates the slide and options', () => {
  const slide = { id: 'slide-node' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  let delegated = null;

  const result = slideIdAdapter.getStudioEditorSlideId(slide, {
    domApi: {
      getStudioSlideId(slideValue, optionsValue) {
        delegated = { slideValue, optionsValue };
        return 'slide-1';
      }
    },
    domOptions
  });

  assert.equal(result, 'slide-1');
  assert.equal(delegated.slideValue, slide);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorSlideId prefers an explicit reader', () => {
  assert.equal(
    slideIdAdapter.getStudioEditorSlideId({}, {
      domApi: {
        getStudioSlideId() {
          throw new Error('DOM API fallback should not run');
        }
      },
      slideIdReader: () => 'slide-2',
      domOptions: {}
    }),
    'slide-2'
  );
});

test('slide ID adapter fails closed without the requested operation', () => {
  assert.equal(slideIdAdapter.assignStudioEditorSlideId({}), '');
  assert.equal(slideIdAdapter.getStudioEditorSlideId({}), '');
});
