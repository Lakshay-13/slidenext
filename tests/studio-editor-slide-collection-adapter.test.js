const test = require('node:test');
const assert = require('node:assert/strict');

const slideCollectionAdapter = require('../shared/studio-editor-slide-collection-adapter.js');

test('getStudioEditorSlides delegates the document and options', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  let delegated = null;

  const result = slideCollectionAdapter.getStudioEditorSlides(doc, {
    domApi: {
      getStudioSlides(docValue, optionsValue) {
        delegated = { docValue, optionsValue };
        return ['slide-1'];
      }
    },
    domOptions
  });

  assert.deepEqual(result, ['slide-1']);
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorSlideById delegates the ID, document, and options', () => {
  const doc = { id: 'iframe-doc' };
  const slide = { id: 'slide-node' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  let delegated = null;

  const result = slideCollectionAdapter.getStudioEditorSlideById('slide-1', doc, {
    domApi: {
      getStudioSlideById(slideId, docValue, optionsValue) {
        delegated = { slideId, docValue, optionsValue };
        return slide;
      }
    },
    domOptions
  });

  assert.equal(result, slide);
  assert.equal(delegated.slideId, 'slide-1');
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorSlideIndexById delegates the ID, document, and options', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  let delegated = null;

  const result = slideCollectionAdapter.getStudioEditorSlideIndexById('slide-1', doc, {
    domApi: {
      getStudioSlideIndexById(slideId, docValue, optionsValue) {
        delegated = { slideId, docValue, optionsValue };
        return 2;
      }
    },
    domOptions
  });

  assert.equal(result, 2);
  assert.equal(delegated.slideId, 'slide-1');
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('slide collection adapter prefers explicit readers', () => {
  const options = {
    domApi: {
      getStudioSlides() {
        throw new Error('DOM slides fallback should not run');
      },
      getStudioSlideById() {
        throw new Error('DOM slide lookup fallback should not run');
      },
      getStudioSlideIndexById() {
        throw new Error('DOM slide index fallback should not run');
      }
    },
    slidesReader: () => ['explicit-slide'],
    slideByIdReader: () => ({ id: 'explicit-slide' }),
    slideIndexByIdReader: () => 4,
    domOptions: {}
  };

  assert.deepEqual(slideCollectionAdapter.getStudioEditorSlides({}, options), ['explicit-slide']);
  assert.deepEqual(slideCollectionAdapter.getStudioEditorSlideById('id', {}, options), { id: 'explicit-slide' });
  assert.equal(slideCollectionAdapter.getStudioEditorSlideIndexById('id', {}, options), 4);
});

test('slide collection adapter fails closed without the requested operation', () => {
  assert.deepEqual(slideCollectionAdapter.getStudioEditorSlides({}), []);
  assert.equal(slideCollectionAdapter.getStudioEditorSlideById('id', {}), null);
  assert.equal(slideCollectionAdapter.getStudioEditorSlideIndexById('id', {}), -1);
});

test('createStudioEditorSlideCollectionReaders owns DOM option composition', () => {
  const calls = [];
  const doc = { id: 'iframe-doc' };
  const domOptions = { editorSlideIdAttr: 'data-slide-id' };
  const readers = slideCollectionAdapter.createStudioEditorSlideCollectionReaders({
    domApi: {
      getStudioSlides(docValue, optionsValue) {
        calls.push(['slides', docValue, optionsValue]);
        return ['slide-1'];
      },
      getStudioSlideById(slideId, docValue, optionsValue) {
        calls.push(['by-id', slideId, docValue, optionsValue]);
        return { id: slideId };
      },
      getStudioSlideIndexById(slideId, docValue, optionsValue) {
        calls.push(['index', slideId, docValue, optionsValue]);
        return 2;
      }
    }
  });

  assert.deepEqual(readers.getStudioEditorSlides(doc, domOptions), ['slide-1']);
  assert.deepEqual(readers.getStudioEditorSlideById('slide-1', doc, domOptions), { id: 'slide-1' });
  assert.equal(readers.getStudioEditorSlideIndexById('slide-1', doc, domOptions), 2);
  assert.deepEqual(calls, [
    ['slides', doc, domOptions],
    ['by-id', 'slide-1', doc, domOptions],
    ['index', 'slide-1', doc, domOptions]
  ]);
});
