const test = require('node:test');
const assert = require('node:assert/strict');

const slideAccessors = require('../shared/studio-editor-slide-accessors.js');

test('slide accessors resolve DOM adapters and normalize shared options', () => {
  const doc = { id: 'iframe-doc' };
  const calls = [];
  const accessors = slideAccessors.createStudioEditorSlideAccessors({
    slideIdAdapter: {
      assignStudioEditorSlideId(slide, options) {
        calls.push(['assign', slide, options]);
        return 'slide-1';
      },
      getStudioEditorSlideId(slide, options) {
        calls.push(['read', slide, options]);
        return 'slide-1';
      }
    },
    slideCollectionAdapter: {
      getStudioEditorSlides(docValue, options) {
        calls.push(['slides', docValue, options]);
        return ['slide-1'];
      },
      getStudioEditorSlideById(slideId, docValue, options) {
        calls.push(['by-id', slideId, docValue, options]);
        return { id: slideId };
      },
      getStudioEditorSlideIndexById(slideId, docValue, options) {
        calls.push(['index', slideId, docValue, options]);
        return 2;
      }
    },
    domApi: { name: 'dom-api' },
    getDocument: () => doc,
    getDomOptions: (overrides = {}) => ({
      slideAttrName: 'data-slide-id',
      ...overrides
    })
  });

  const slide = { id: 'slide-node' };
  assert.equal(accessors.assignSlideId(slide, { editorSlideIdAttr: 'data-id' }), 'slide-1');
  assert.equal(accessors.getSlideId(slide, { editorSlideIdAttr: 'data-id' }), 'slide-1');
  assert.deepEqual(accessors.getSlides(), ['slide-1']);
  assert.deepEqual(accessors.getSlideById('slide-3'), { id: 'slide-3' });
  assert.equal(accessors.getSlideIndexById('slide-3'), 2);

  assert.deepEqual(calls, [
    ['assign', slide, {
      domApi: { name: 'dom-api' },
      domOptions: { slideAttrName: 'data-slide-id', editorSlideIdAttr: 'data-id' }
    }],
    ['read', slide, {
      domApi: { name: 'dom-api' },
      domOptions: { slideAttrName: 'data-slide-id', editorSlideIdAttr: 'data-id' }
    }],
    ['slides', doc, {
      domApi: { name: 'dom-api' },
      domOptions: { slideAttrName: 'data-slide-id' }
    }],
    ['by-id', 'slide-3', doc, {
      domApi: { name: 'dom-api' },
      domOptions: { slideAttrName: 'data-slide-id' }
    }],
    ['index', 'slide-3', doc, {
      domApi: { name: 'dom-api' },
      domOptions: { slideAttrName: 'data-slide-id' }
    }]
  ]);
});

test('slide accessors fail closed when adapters are unavailable', () => {
  const accessors = slideAccessors.createStudioEditorSlideAccessors({
    slideIdAdapter: null,
    slideCollectionAdapter: null
  });

  assert.equal(accessors.assignSlideId({}), '');
  assert.equal(accessors.getSlideId({}), '');
  assert.deepEqual(accessors.getSlides(), []);
  assert.equal(accessors.getSlideById('slide-1'), null);
  assert.equal(accessors.getSlideIndexById('slide-1'), -1);
});
