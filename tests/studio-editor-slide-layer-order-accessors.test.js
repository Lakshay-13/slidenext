const test = require('node:test');
const assert = require('node:assert/strict');

const slideLayerOrderAccessors = require('../shared/studio-editor-slide-layer-order-accessors.js');

test('slide layer-order accessors resolve the DOM adapter and shared options', () => {
  const calls = [];
  const slide = { id: 'slide-1' };
  const domApi = { name: 'dom-api' };
  const accessors = slideLayerOrderAccessors.createStudioEditorSlideLayerOrderAccessors({
    slideLayerOrderAdapter: {
      getStudioEditorNormalizedSlideLayerOrder(slideValue, options) {
        calls.push(['read', slideValue, options]);
        return ['element-1'];
      },
      applyStudioEditorSlideLayerOrder(slideValue, elementsValue, options) {
        calls.push(['write', slideValue, elementsValue, options]);
        return elementsValue;
      }
    },
    domApi,
    getDomOptions: (overrides = {}) => ({
      editorSlideIdAttr: 'data-slide-id',
      ...overrides
    })
  });

  assert.deepEqual(
    accessors.getNormalizedSlideLayerOrder(slide, { includeHidden: true }),
    ['element-1']
  );
  const orderedElements = [{ id: 'element-1' }];
  assert.deepEqual(
    accessors.applySlideLayerOrder(slide, orderedElements),
    orderedElements
  );
  assert.deepEqual(calls, [
    ['read', slide, {
      domApi,
      domOptions: {
        editorSlideIdAttr: 'data-slide-id',
        includeHidden: true
      }
    }],
    ['write', slide, orderedElements, { domApi }]
  ]);
});

test('slide layer-order accessors fail closed when the adapter is unavailable', () => {
  const accessors = slideLayerOrderAccessors.createStudioEditorSlideLayerOrderAccessors({
    slideLayerOrderAdapter: null
  });

  assert.deepEqual(accessors.getNormalizedSlideLayerOrder({}), []);
  assert.deepEqual(accessors.applySlideLayerOrder({}, []), []);
});
