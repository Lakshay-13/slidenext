const test = require('node:test');
const assert = require('node:assert/strict');

const selectionStateAdapter = require('../shared/studio-editor-selection-state-adapter.js');

test('applyStudioEditorSelectionState normalizes and stores selection state', () => {
  const nextState = { selectedElements: [{ id: 'node-1' }] };
  const normalizedState = { selectedElements: [{ id: 'node-1' }], selectedElement: { id: 'node-1' } };
  let delegatedOptions = null;
  let appliedState = null;

  const result = selectionStateAdapter.applyStudioEditorSelectionState(nextState, {
    selectionApi: {
      normalizeStudioSelectionState(currentState, options) {
        delegatedOptions = { currentState, options };
        return normalizedState;
      }
    },
    getSelectionOptions: () => ({ selectionOptions: true }),
    setSelectionState: (state) => {
      appliedState = state;
    }
  });

  assert.equal(result, true);
  assert.equal(delegatedOptions.currentState, nextState);
  assert.deepEqual(delegatedOptions.options, { selectionOptions: true });
  assert.equal(appliedState, normalizedState);
});

test('applyStudioEditorSelectionState clears local state when normalization is unavailable', () => {
  let cleared = 0;
  assert.equal(
    selectionStateAdapter.applyStudioEditorSelectionState({}, {
      clearSelectionState: () => { cleared += 1; }
    }),
    false
  );
  assert.equal(cleared, 1);
});
