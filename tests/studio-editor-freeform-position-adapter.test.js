const test = require('node:test');
const assert = require('node:assert/strict');

const freeformPositionAdapter = require('../shared/studio-editor-freeform-position-adapter.js');

test('isStudioEditorFreeformPositioned delegates element and options', () => {
  const element = { id: 'element-1' };
  const positionOptions = { view: { id: 'view-1' } };
  let delegated = null;

  const result = freeformPositionAdapter.isStudioEditorFreeformPositioned(element, {
    transformApi: {
      isStudioFreeformPositioned(elementValue, optionsValue) {
        delegated = { elementValue, optionsValue };
        return true;
      }
    },
    positionOptions
  });

  assert.equal(result, true);
  assert.equal(delegated.elementValue, element);
  assert.equal(delegated.optionsValue, positionOptions);
});

test('isStudioEditorFreeformPositioned prefers an explicit reader', () => {
  assert.equal(
    freeformPositionAdapter.isStudioEditorFreeformPositioned({}, {
      transformApi: {
        isStudioFreeformPositioned() {
          throw new Error('transform API fallback should not run');
        }
      },
      freeformPositionReader: () => true,
      positionOptions: {}
    }),
    true
  );
});

test('isStudioEditorFreeformPositioned fails closed without a reader', () => {
  assert.equal(
    freeformPositionAdapter.isStudioEditorFreeformPositioned({}),
    false
  );
});
