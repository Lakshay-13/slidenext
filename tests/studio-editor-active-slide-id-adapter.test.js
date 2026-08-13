const test = require('node:test');
const assert = require('node:assert/strict');

const activeSlideIdAdapter = require('../shared/studio-editor-active-slide-id-adapter.js');

test('getStudioEditorActiveSlideId delegates the document and options', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { editorElementIdAttr: 'data-editor-id' };
  let delegated = null;

  const result = activeSlideIdAdapter.getStudioEditorActiveSlideId(doc, {
    domApi: {
      getStudioActiveSlideId(docValue, optionsValue) {
        delegated = { docValue, optionsValue };
        return 'slide-1';
      }
    },
    domOptions
  });

  assert.equal(result, 'slide-1');
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorActiveSlideId prefers an explicit resolver', () => {
  assert.equal(
    activeSlideIdAdapter.getStudioEditorActiveSlideId({}, {
      domApi: {
        getStudioActiveSlideId() {
          throw new Error('DOM API fallback should not run');
        }
      },
      activeSlideIdResolver: () => 'slide-2',
      domOptions: {}
    }),
    'slide-2'
  );
});

test('getStudioEditorActiveSlideId fails closed without a resolver', () => {
  assert.equal(
    activeSlideIdAdapter.getStudioEditorActiveSlideId({}),
    ''
  );
});
