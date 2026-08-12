const test = require('node:test');
const assert = require('node:assert/strict');
const alignmentController = require('../shared/studio-editor-alignment-controller.js');

test('alignment controller assembles canonical layout and transaction dependencies', () => {
  const calls = [];
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout(selection, action) {
        calls.push(['build', selection, action]);
        return { didChange: true, nextItems: [{ element: { id: 'node-1' } }] };
      },
      buildStudioDistributedLayout(selection, axis) {
        calls.push(['distribute', selection, axis]);
        return { didChange: true, nextItems: [{ element: { id: 'node-1' } }] };
      }
    },
    canonicalLayoutApi: {
      createStudioCanonicalLayoutMutationBuilder(options) {
        calls.push(['builder', options]);
        return (mutationOptions) => {
          calls.push(['canonical', mutationOptions]);
          return { id: 'canonical-deck' };
        };
      }
    },
    canonicalDeckApi: { id: 'deck-api' },
    getCanonicalDeckBaseline: () => ({ slides: ['live'] }),
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'selection-1' }, { id: 'selection-2' }, { id: 'selection-3' }]
      }
    }),
    getIframeDoc: () => ({ id: 'doc' }),
    assignElementId: () => 'node-1',
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    applyPositionLayout: (...args) => {
      calls.push(['position', ...args]);
      return { didApply: true, transaction: { id: 'position-transaction' } };
    },
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.align('middle'), true);
  assert.equal(controller.distribute('horizontal'), true);
  assert.equal(calls[0][0], 'build');
  assert.equal(calls[0][2], 'middle');
  assert.equal(calls[1][0], 'builder');
  assert.equal(calls[1][1].canonicalDeckApi.id, 'deck-api');
  assert.equal(typeof calls[1][1].buildCanonicalDeckBaseline, 'function');
  assert.deepEqual(calls[1][1].getCanonicalDeckBaseline(), { slides: ['live'] });
  assert.equal(calls[2][0], 'canonical');
  assert.equal(calls[2][1].sourceDocument.id, 'doc');
  assert.equal(calls[3][0], 'position');
  assert.equal(calls[4][0], 'finalize');
  assert.equal(calls[4][1], 'Auto: Aligned middle');
  assert.equal(calls[5][0], 'distribute');
  assert.equal(calls[5][2], 'horizontal');
  assert.equal(calls[9][0], 'finalize');
  assert.equal(calls[9][1], 'Auto: Distributed horizontal');
});

test('alignment controller refreshes state and fails closed for unavailable actions', () => {
  const calls = [];
  const controller = alignmentController.createStudioEditorAlignmentController({
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: false,
        selection: []
      }
    }),
    updateAlignmentActionState: () => calls.push('update')
  });

  assert.equal(controller.align('left'), false);
  assert.equal(controller.distribute('vertical'), false);
  assert.deepEqual(calls, ['update', 'update']);
});

test('alignment controller fails closed before DOM mutation when finalization is unavailable', () => {
  let applyCalls = 0;
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      },
      buildStudioDistributedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 16, nextTop: 18 }]
        };
      }
    },
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }]
      }
    }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(controller.align('left'), false);
  assert.equal(controller.distribute('horizontal'), false);
  assert.equal(applyCalls, 0);
});

test('alignment controller rolls back when finalization rejects the position mutation', () => {
  const transaction = { id: 'position-tx' };
  const rollbackCalls = [];
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }]
      }
    }),
    applyPositionLayout: () => ({ didApply: true, transaction }),
    finalizeDeckMutation: () => false,
    rollbackPositionMutation: (...args) => rollbackCalls.push(args)
  });

  assert.equal(controller.align('left'), false);
  assert.deepEqual(rollbackCalls, [[transaction, null]]);
});

test('alignment controller rolls back when finalization throws', () => {
  const transaction = { id: 'position-tx' };
  const rollbackCalls = [];
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }]
      }
    }),
    applyPositionLayout: () => ({ didApply: true, transaction }),
    finalizeDeckMutation: () => {
      throw new Error('history finalization failed');
    },
    rollbackPositionMutation: (...args) => rollbackCalls.push(args)
  });

  assert.doesNotThrow(() => {
    assert.equal(controller.align('left'), false);
  });
  assert.deepEqual(rollbackCalls, [[transaction, null]]);
});

test('alignment controller requires three selected elements for distribution', () => {
  let buildCalls = 0;
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioDistributedLayout() {
        buildCalls += 1;
        return { didChange: true, nextItems: [] };
      }
    },
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }]
      }
    })
  });

  assert.equal(controller.distribute('horizontal'), false);
  assert.equal(buildCalls, 0);
});

test('alignment controller fails closed before DOM mutation when canonical layout construction throws', () => {
  let applyCalls = 0;
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      },
      buildStudioDistributedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 16, nextTop: 18 }]
        };
      }
    },
    canonicalLayoutApi: {
      createStudioCanonicalLayoutMutationBuilder() {
        return () => {
          throw new Error('canonical layout unavailable');
        };
      }
    },
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }, { id: 'three' }]
      }
    }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(controller.align('left'), false);
  assert.equal(controller.distribute('horizontal'), false);
  assert.equal(applyCalls, 0);
});

test('alignment controller fails closed before DOM mutation when the canonical sidecar is null', () => {
  let applyCalls = 0;
  const controller = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    canonicalLayoutApi: {
      buildStudioCanonicalLayoutBaseline() {
        return { slides: [{ id: 'slide-1', nodes: [] }] };
      },
      createStudioCanonicalLayoutMutationBuilder() {
        return () => null;
      }
    },
    canonicalDeckApi: {},
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    buildAlignmentActionState: () => ({
      alignmentActionState: {
        canAlign: true,
        selection: [{ id: 'one' }, { id: 'two' }]
      }
    }),
    getIframeDoc: () => ({ id: 'doc' }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(controller.align('left'), false);
  assert.equal(applyCalls, 0);
});
