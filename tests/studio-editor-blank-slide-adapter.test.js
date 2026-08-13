const test = require('node:test');
const assert = require('node:assert/strict');

const blankSlideAdapter = require('../shared/studio-editor-blank-slide-adapter.js');

test('createStudioEditorBlankSlide delegates the document and options', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { slideClassName: 'slide' };
  let delegated = null;

  const result = blankSlideAdapter.createStudioEditorBlankSlide(doc, {
    domApi: {
      createStudioBlankSlide(docValue, optionsValue) {
        delegated = { docValue, optionsValue };
        return { id: 'slide-1' };
      }
    },
    domOptions
  });

  assert.deepEqual(result, { id: 'slide-1' });
  assert.equal(delegated.docValue, doc);
  assert.deepEqual(delegated.optionsValue, domOptions);
});

test('blank-slide adapter prefers an explicit factory', () => {
  const options = {
    domApi: {
      createStudioBlankSlide() {
        throw new Error('DOM blank-slide fallback should not run');
      }
    },
    blankSlideFactory: () => ({ id: 'explicit-slide' }),
    domOptions: {}
  };

  assert.deepEqual(
    blankSlideAdapter.createStudioEditorBlankSlide({}, options),
    { id: 'explicit-slide' }
  );
});

test('blank-slide adapter fails closed without the requested operation', () => {
  assert.equal(blankSlideAdapter.createStudioEditorBlankSlide({}), null);
});
