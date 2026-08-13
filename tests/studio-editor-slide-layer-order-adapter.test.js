const test = require('node:test');
const assert = require('node:assert/strict');

const slideLayerOrderAdapter = require('../shared/studio-editor-slide-layer-order-adapter.js');

test('getStudioEditorNormalizedSlideLayerOrder delegates the slide and options', () => {
  const slide = { id: 'slide-1' };
  const domOptions = { getSlideEditableElements: () => [] };
  let delegated = null;

  const result = slideLayerOrderAdapter.getStudioEditorNormalizedSlideLayerOrder(slide, {
    domApi: {
      getNormalizedStudioSlideLayerOrder(slideValue, optionsValue) {
        delegated = { slideValue, optionsValue };
        return ['element-1'];
      }
    },
    domOptions
  });

  assert.deepEqual(result, ['element-1']);
  assert.equal(delegated.slideValue, slide);
  assert.equal(delegated.optionsValue, domOptions);
});

test('applyStudioEditorSlideLayerOrder delegates the slide and ordered elements', () => {
  const slide = { id: 'slide-1' };
  const orderedElements = [{ id: 'element-1' }];
  let delegated = null;

  const result = slideLayerOrderAdapter.applyStudioEditorSlideLayerOrder(slide, orderedElements, {
    domApi: {
      applyStudioSlideLayerOrder(slideValue, elementsValue) {
        delegated = { slideValue, elementsValue };
        return elementsValue;
      }
    }
  });

  assert.equal(result, orderedElements);
  assert.equal(delegated.slideValue, slide);
  assert.equal(delegated.elementsValue, orderedElements);
});

test('slide layer-order adapter prefers explicit readers and writers', () => {
  const options = {
    domApi: {
      getNormalizedStudioSlideLayerOrder() {
        throw new Error('DOM layer-order reader fallback should not run');
      },
      applyStudioSlideLayerOrder() {
        throw new Error('DOM layer-order writer fallback should not run');
      }
    },
    layerOrderReader: () => ['explicit-element'],
    layerOrderWriter: () => ['written-element']
  };

  assert.deepEqual(
    slideLayerOrderAdapter.getStudioEditorNormalizedSlideLayerOrder({}, options),
    ['explicit-element']
  );
  assert.deepEqual(
    slideLayerOrderAdapter.applyStudioEditorSlideLayerOrder({}, [], options),
    ['written-element']
  );
});

test('slide layer-order adapter fails closed without the requested operation', () => {
  assert.deepEqual(
    slideLayerOrderAdapter.getStudioEditorNormalizedSlideLayerOrder({}),
    []
  );
  assert.deepEqual(
    slideLayerOrderAdapter.applyStudioEditorSlideLayerOrder({}, []),
    []
  );
});
