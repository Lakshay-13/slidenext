const test = require('node:test');
const assert = require('node:assert/strict');

const hoverableElementsAdapter = require('../shared/studio-editor-hoverable-elements-adapter.js');

test('makeStudioEditorElementsHoverable delegates the root and options', () => {
  const root = { id: 'iframe-document' };
  const domOptions = { selectableSelector: '[data-editor-id]' };
  let delegated = null;

  const result = hoverableElementsAdapter.makeStudioEditorElementsHoverable(root, {
    domApi: {
      makeStudioElementsHoverable(rootValue, optionsValue) {
        delegated = { rootValue, optionsValue };
        return ['element-1'];
      }
    },
    domOptions
  });

  assert.deepEqual(result, ['element-1']);
  assert.equal(delegated.rootValue, root);
  assert.equal(delegated.optionsValue, domOptions);
});

test('hoverable-elements adapter prefers an explicit decorator', () => {
  const options = {
    domApi: {
      makeStudioElementsHoverable() {
        throw new Error('DOM hoverable fallback should not run');
      }
    },
    hoverableDecorator: () => ['explicit-element'],
    domOptions: {}
  };

  assert.deepEqual(
    hoverableElementsAdapter.makeStudioEditorElementsHoverable({}, options),
    ['explicit-element']
  );
});

test('hoverable-elements adapter fails closed without the requested operation', () => {
  assert.deepEqual(
    hoverableElementsAdapter.makeStudioEditorElementsHoverable({}),
    []
  );
});
