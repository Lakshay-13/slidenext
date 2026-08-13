const test = require('node:test');
const assert = require('node:assert/strict');

const positionedLayoutItemsAdapter = require('../shared/studio-editor-positioned-layout-items-adapter.js');

test('buildStudioEditorPositionedLayoutItems delegates elements and options', () => {
  const elements = [{ id: 'element-1' }, { id: 'element-2' }];
  const layoutOptions = { slideMetrics: { scaleX: 2 } };
  const layoutItems = [{ element: elements[0] }, { element: elements[1] }];
  let delegated = null;

  const result = positionedLayoutItemsAdapter.buildStudioEditorPositionedLayoutItems(elements, {
    transformApi: {
      buildStudioPositionedLayoutItems(currentElements, options) {
        delegated = { currentElements, options };
        return layoutItems;
      }
    },
    layoutOptions
  });

  assert.equal(result, layoutItems);
  assert.equal(delegated.currentElements, elements);
  assert.equal(delegated.options, layoutOptions);
});

test('buildStudioEditorPositionedLayoutItems prefers an explicit builder', () => {
  const layoutItems = [{ element: { id: 'element-1' } }];
  assert.equal(
    positionedLayoutItemsAdapter.buildStudioEditorPositionedLayoutItems([], {
      transformApi: {
        buildStudioPositionedLayoutItems() {
          throw new Error('transform API fallback should not run');
        }
      },
      layoutItemsBuilder: () => layoutItems,
      layoutOptions: {}
    }),
    layoutItems
  );
});

test('buildStudioEditorPositionedLayoutItems fails closed without a builder', () => {
  assert.equal(
    positionedLayoutItemsAdapter.buildStudioEditorPositionedLayoutItems([], {}),
    null
  );
});
