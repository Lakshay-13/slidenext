const test = require('node:test');
const assert = require('node:assert/strict');

const closestPositionedAncestorAdapter = require('../shared/studio-editor-closest-positioned-ancestor-adapter.js');

test('getStudioEditorClosestPositionedAncestor delegates the element and options', () => {
  const element = { id: 'element-1' };
  const domOptions = { slideSelector: '.frame' };
  const ancestor = { id: 'ancestor-1' };
  let delegated = null;

  const result = closestPositionedAncestorAdapter.getStudioEditorClosestPositionedAncestor(element, {
    domApi: {
      getStudioClosestPositionedAncestor(elementValue, optionsValue) {
        delegated = { elementValue, optionsValue };
        return ancestor;
      }
    },
    domOptions
  });

  assert.equal(result, ancestor);
  assert.equal(delegated.elementValue, element);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorClosestPositionedAncestor prefers an explicit resolver', () => {
  const ancestor = { id: 'ancestor-1' };

  assert.equal(
    closestPositionedAncestorAdapter.getStudioEditorClosestPositionedAncestor({}, {
      domApi: {
        getStudioClosestPositionedAncestor() {
          throw new Error('DOM API fallback should not run');
        }
      },
      positionedAncestorResolver: () => ancestor,
      domOptions: {}
    }),
    ancestor
  );
});

test('getStudioEditorClosestPositionedAncestor fails closed without a resolver', () => {
  assert.equal(
    closestPositionedAncestorAdapter.getStudioEditorClosestPositionedAncestor({}),
    null
  );
});
