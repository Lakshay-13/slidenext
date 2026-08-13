const test = require('node:test');
const assert = require('node:assert/strict');

const positionedLayoutItemAdapter = require('../shared/studio-editor-positioned-layout-item-adapter.js');

test('buildStudioEditorPositionedLayoutItem delegates element and options', () => {
  const element = { id: 'element-1' };
  const layoutOptions = { slideMetrics: { scaleX: 2 } };
  const layoutItem = { element, absLeft: 10, absTop: 20 };
  let delegated = null;

  const result = positionedLayoutItemAdapter.buildStudioEditorPositionedLayoutItem(element, {
    transformApi: {
      buildStudioPositionedLayoutItem(elementValue, optionsValue) {
        delegated = { elementValue, optionsValue };
        return layoutItem;
      }
    },
    layoutOptions
  });

  assert.equal(result, layoutItem);
  assert.equal(delegated.elementValue, element);
  assert.equal(delegated.optionsValue, layoutOptions);
});

test('buildStudioEditorPositionedLayoutItem prefers an explicit builder', () => {
  const layoutItem = { element: { id: 'element-1' } };

  assert.equal(
    positionedLayoutItemAdapter.buildStudioEditorPositionedLayoutItem({}, {
      transformApi: {
        buildStudioPositionedLayoutItem() {
          throw new Error('transform API fallback should not run');
        }
      },
      layoutItemBuilder: () => layoutItem,
      layoutOptions: {}
    }),
    layoutItem
  );
});

test('buildStudioEditorPositionedLayoutItem fails closed without a builder', () => {
  assert.equal(
    positionedLayoutItemAdapter.buildStudioEditorPositionedLayoutItem({}, {}),
    null
  );
});
