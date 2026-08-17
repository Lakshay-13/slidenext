const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-geometry-composition.js');

test('geometry composition wires transform and DOM adapters without changing their option boundaries', () => {
  const calls = [];
  const transformApi = {
    isStudioFreeformPositioned(element, options) {
      calls.push(['freeform', element, options]);
      return true;
    },
    buildStudioTransformSelectionState(elements, options) {
      calls.push(['selection', elements, options]);
      return { elements };
    },
    buildStudioPositionedLayoutItems(elements, options) {
      calls.push(['layout', elements, options]);
      return [{ elements }];
    }
  };
  const domApi = {
    getStudioClosestPositionedAncestor(element) {
      calls.push(['ancestor', element]);
      return { id: 'parent-1' };
    }
  };
  const adapters = composition.createStudioEditorGeometryComposition({
    freeformPositionAdapterApi: require('../shared/studio-editor-freeform-position-adapter.js'),
    transformSelectionStateAdapterApi: require('../shared/studio-editor-transform-selection-state-adapter.js'),
    positionedLayoutItemsAdapterApi: require('../shared/studio-editor-positioned-layout-items-adapter.js'),
    closestPositionedAncestorAdapterApi: require('../shared/studio-editor-closest-positioned-ancestor-adapter.js'),
    transformApi,
    domApi
  });
  const element = { id: 'node-1' };
  const elements = [element, { id: 'node-2' }];
  const positionOptions = { position: 'absolute' };
  const selectionOptions = { canTransform: true };
  const layoutOptions = { slideMetrics: { width: 1920 } };

  assert.equal(adapters.freeformPositionReader(element, positionOptions), true);
  assert.deepEqual(adapters.transformSelectionStateBuilder(elements, selectionOptions), { elements });
  assert.deepEqual(adapters.positionedLayoutItemsBuilder(elements, layoutOptions), [{ elements }]);
  assert.deepEqual(adapters.closestPositionedAncestorResolver(element), { id: 'parent-1' });
  assert.deepEqual(calls, [
    ['freeform', element, positionOptions],
    ['selection', elements, selectionOptions],
    ['layout', elements, layoutOptions],
    ['ancestor', element]
  ]);
});

test('geometry composition fails closed when shared geometry dependencies are unavailable', () => {
  const adapters = composition.createStudioEditorGeometryComposition({
    freeformPositionAdapterApi: null,
    transformSelectionStateAdapterApi: null,
    positionedLayoutItemsAdapterApi: null,
    closestPositionedAncestorAdapterApi: null,
    transformApi: null,
    domApi: null
  });

  assert.equal(adapters.freeformPositionReader, null);
  assert.equal(adapters.transformSelectionStateBuilder, null);
  assert.equal(adapters.positionedLayoutItemsBuilder, null);
  assert.equal(adapters.closestPositionedAncestorResolver, null);
});
