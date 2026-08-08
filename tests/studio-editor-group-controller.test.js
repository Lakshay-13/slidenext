const test = require('node:test');
const assert = require('node:assert/strict');
const groupController = require('../shared/studio-editor-group-controller.js');

test('group controller commits grouped selection and finalizes the mutation', () => {
  const calls = [];
  const slide = { id: 'slide-1' };
  const parent = {
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 100, bottom: 100 };
    }
  };
  const first = { id: 'first' };
  const second = { id: 'second' };
  const group = { id: 'group' };
  const controller = groupController.createStudioEditorGroupController({
    buildGroupSelectionActionState: () => ({
      canGroup: true,
      slide,
      parent,
      selection: [first, second],
      groupPlan: { bounds: { left: 10, top: 20 }, nextItems: [] }
    }),
    getIframeDoc: () => ({ id: 'doc' }),
    getSlideMetrics: () => ({ scaleX: 1 }),
    getRectOnSlide: (rect) => rect,
    getNormalizedSlideLayerOrder: () => [first, second],
    applyGroupMutation: (options) => {
      calls.push(['apply', options]);
      return { didApply: true, group, transaction: { id: 'tx' } };
    },
    commitSelectionState: (state) => calls.push(['commit', state]),
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.group(), true);
  assert.equal(calls[0][0], 'apply');
  assert.equal(calls[0][1].documentRef.id, 'doc');
  assert.deepEqual(calls[0][1].orderedSelection, [first, second]);
  assert.deepEqual(calls[1], ['commit', { selectedElements: [group] }]);
  assert.equal(calls[2][1], 'Auto: Grouped Elements');
  assert.deepEqual(calls[2][2].transaction, { id: 'tx' });
});

test('group controller commits restored selection and finalizes ungrouping', () => {
  const calls = [];
  const slide = { id: 'slide-1' };
  const group = { id: 'group', parentElement: slide };
  const child = { id: 'child' };
  const controller = groupController.createStudioEditorGroupController({
    buildUngroupSelectionActionState: () => ({
      canUngroup: true,
      slide,
      groups: [group]
    }),
    getSlideMetrics: () => ({ scaleX: 1 }),
    getRectOnSlide: (rect) => rect,
    applyUngroupMutation: (options) => {
      calls.push(['apply', options]);
      return {
        didApply: true,
        restoredElements: [child],
        transaction: { id: 'tx' }
      };
    },
    commitSelectionState: (state) => calls.push(['commit', state]),
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.ungroup(), true);
  assert.deepEqual(calls[0][1].groups, [group]);
  assert.deepEqual(calls[1], ['commit', { selectedElements: [child] }]);
  assert.equal(calls[2][1], 'Auto: Ungrouped Elements');
  assert.deepEqual(calls[2][2].transaction, { id: 'tx' });
});

test('group controller refreshes state and fails closed when actions are unavailable', () => {
  const calls = [];
  const controller = groupController.createStudioEditorGroupController({
    buildGroupSelectionActionState: () => ({ canGroup: false }),
    buildUngroupSelectionActionState: () => ({ canUngroup: false }),
    updateGroupActionState: () => calls.push('update')
  });

  assert.equal(controller.group(), false);
  assert.equal(controller.ungroup(), false);
  assert.deepEqual(calls, ['update', 'update']);
});
