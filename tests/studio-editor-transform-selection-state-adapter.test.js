const test = require('node:test');
const assert = require('node:assert/strict');

const transformSelectionStateAdapter = require('../shared/studio-editor-transform-selection-state-adapter.js');

test('buildStudioEditorTransformSelectionState delegates elements and options', () => {
  const elements = [{ id: 'element-1' }];
  const selectionOptions = { isLocked: () => false };
  const state = { canTransform: true, selection: elements };
  let delegated = null;

  const result = transformSelectionStateAdapter.buildStudioEditorTransformSelectionState(elements, {
    transformApi: {
      buildStudioTransformSelectionState(currentElements, options) {
        delegated = { currentElements, options };
        return state;
      }
    },
    selectionOptions
  });

  assert.equal(result, state);
  assert.equal(delegated.currentElements, elements);
  assert.equal(delegated.options, selectionOptions);
});

test('buildStudioEditorTransformSelectionState prefers an explicit builder', () => {
  const explicitState = { canTransform: false, selection: [] };
  const transformApi = {
    buildStudioTransformSelectionState() {
      throw new Error('transform API fallback should not run');
    }
  };

  assert.equal(
    transformSelectionStateAdapter.buildStudioEditorTransformSelectionState([], {
      transformApi,
      selectionStateBuilder: () => explicitState,
      selectionOptions: {}
    }),
    explicitState
  );
});

test('buildStudioEditorTransformSelectionState fails closed without a builder', () => {
  assert.equal(
    transformSelectionStateAdapter.buildStudioEditorTransformSelectionState([], {}),
    null
  );
});
