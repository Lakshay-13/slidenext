const test = require('node:test');
const assert = require('node:assert/strict');

const activeSlideAccessors = require('../shared/studio-editor-active-slide-accessors.js');

test('active-slide accessors resolve the frame document and DOM options through shared adapters', () => {
  const doc = { id: 'iframe-doc' };
  const domOptions = { slideAttrName: 'data-slide-id' };
  const activeSlide = { id: 'slide-1' };
  const calls = [];
  const accessors = activeSlideAccessors.createStudioEditorActiveSlideAccessors({
    activeSlideAdapter: {
      getStudioEditorActiveSlide(docValue, options) {
        calls.push([docValue, options]);
        return activeSlide;
      }
    },
    getDocument: () => doc,
    getDomOptions: () => domOptions
  });

  assert.equal(accessors.getActiveSlide(), activeSlide);
  assert.deepEqual(calls, [[doc, { domApi: null, domOptions }]]);
});

test('active-slide ID accessors prefer the session bridge only when requested', () => {
  const calls = [];
  const accessors = activeSlideAccessors.createStudioEditorActiveSlideAccessors({
    activeSlideIdAdapter: {
      getStudioEditorActiveSlideId(doc, options) {
        calls.push([doc, options]);
        return 'dom-slide';
      }
    },
    stateBridge: {
      getSlideId: () => ' stored-slide '
    },
    getDocument: () => ({ id: 'iframe-doc' }),
    getDomOptions: () => ({ slideAttrName: 'data-slide-id' })
  });

  assert.equal(accessors.getActiveSlideId(undefined, { preferStateBridge: true }), 'stored-slide');
  assert.equal(accessors.getActiveSlideId(), 'dom-slide');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].id, 'iframe-doc');
  assert.deepEqual(calls[0][1].domOptions, { slideAttrName: 'data-slide-id' });
});

test('active-slide accessors fail closed when shared adapters are unavailable', () => {
  const accessors = activeSlideAccessors.createStudioEditorActiveSlideAccessors({
    activeSlideAdapter: null,
    activeSlideIdAdapter: null
  });

  assert.equal(accessors.getActiveSlide(), null);
  assert.equal(accessors.getActiveSlideId(), '');
});
