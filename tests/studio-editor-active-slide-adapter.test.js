const test = require('node:test');
const assert = require('node:assert/strict');

const activeSlideAdapter = require('../shared/studio-editor-active-slide-adapter.js');

test('getStudioEditorActiveSlide delegates the document and options', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { activeSlideSelector: '.current' };
  const activeSlide = { id: 'slide-1' };
  let delegated = null;

  const result = activeSlideAdapter.getStudioEditorActiveSlide(doc, {
    domApi: {
      getStudioActiveSlide(docValue, optionsValue) {
        delegated = { docValue, optionsValue };
        return activeSlide;
      }
    },
    domOptions
  });

  assert.equal(result, activeSlide);
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorActiveSlide prefers an explicit resolver', () => {
  const activeSlide = { id: 'slide-1' };

  assert.equal(
    activeSlideAdapter.getStudioEditorActiveSlide({}, {
      domApi: {
        getStudioActiveSlide() {
          throw new Error('DOM API fallback should not run');
        }
      },
      activeSlideResolver: () => activeSlide,
      domOptions: {}
    }),
    activeSlide
  );
});

test('getStudioEditorActiveSlide fails closed without a resolver', () => {
  assert.equal(
    activeSlideAdapter.getStudioEditorActiveSlide({}),
    null
  );
});
