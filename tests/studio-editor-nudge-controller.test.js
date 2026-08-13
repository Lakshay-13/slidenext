const test = require('node:test');
const assert = require('node:assert/strict');
const nudgeController = require('../shared/studio-editor-nudge-controller.js');

test('nudge controller assembles canonical layout and transaction dependencies', () => {
  const calls = [];
  const sourceDocument = { id: 'source-doc' };
  let receivedDocument = null;
  const liveCanonicalDeck = { slides: ['live'] };
  const pendingCanonicalDeck = { slides: ['pending'] };
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout(items, delta, bounds) {
        calls.push(['build', items, delta, bounds]);
        return { didChange: true, nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }] };
      },
      applyStudioNudgedLayout(items, options) {
        calls.push(['apply', items, options]);
        return { didApply: true, transaction: { id: 'transaction' } };
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
    buildMotionSelectionActionState: (doc) => {
      receivedDocument = doc;
      return {
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
      };
    },
    assignElementId: () => 'node-1',
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    getPendingCanonicalDeck: () => pendingCanonicalDeck,
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    applyPositionLayout: (...args) => {
      calls.push(['position', ...args]);
      return { didApply: true, transaction: { id: 'position-transaction' } };
    },
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.nudge(2, -1, sourceDocument), true);
  assert.equal(receivedDocument, sourceDocument);
  assert.equal(calls[0][0], 'build');
  assert.deepEqual(calls[0][2], { dx: 2, dy: -1 });
  assert.deepEqual(calls[0][3], { width: 1920, height: 1080 });
  assert.equal(calls[1][0], 'builder');
  assert.equal(calls[1][1].canonicalDeckApi.id, 'deck-api');
  assert.equal(typeof calls[1][1].buildCanonicalDeckBaseline, 'function');
  assert.equal(calls[1][1].getPendingCanonicalDeck(), pendingCanonicalDeck);
  assert.equal(calls[1][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  assert.equal(calls[2][0], 'canonical');
  assert.equal(calls[2][1].sourceDocument.id, 'doc');
  assert.equal(calls[3][0], 'position');
  assert.equal(typeof calls[3][2].getElementId, 'function');
  assert.equal(calls[4][0], 'finalize');
  assert.equal(calls[4][1], 'Auto: Nudged Element');
  assert.equal(calls[4][2].canonicalDeck.id, 'canonical-deck');
});

test('nudge controller refreshes motion state and fails closed when movement is unavailable', () => {
  const calls = [];
  const controller = nudgeController.createStudioEditorNudgeController({
    buildMotionSelectionActionState: () => ({ canNudge: false, doc: { id: 'doc' } }),
    updateMotionActionState: (doc) => calls.push(doc)
  });

  assert.equal(controller.nudge(1, 0), false);
  assert.deepEqual(calls, [{ id: 'doc' }]);
});

test('nudge controller fails closed before DOM mutation when finalization is unavailable', () => {
  let applyCalls = 0;
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(controller.nudge(1, 0), false);
  assert.equal(applyCalls, 0);
});

test('nudge controller rolls back when finalization rejects the position mutation', () => {
  const transaction = { id: 'position-tx' };
  const rollbackCalls = [];
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    applyPositionLayout: () => ({ didApply: true, transaction }),
    finalizeDeckMutation: () => false,
    rollbackPositionMutation: (...args) => rollbackCalls.push(args)
  });

  assert.equal(controller.nudge(1, 0), false);
  assert.deepEqual(rollbackCalls, [[transaction, { id: 'doc' }]]);
});

test('nudge controller rolls back when finalization throws', () => {
  const transaction = { id: 'position-tx' };
  const rollbackCalls = [];
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
        };
      }
    },
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    applyPositionLayout: () => ({ didApply: true, transaction }),
    finalizeDeckMutation: () => {
      throw new Error('history finalization failed');
    },
    rollbackPositionMutation: (...args) => rollbackCalls.push(args)
  });

  assert.doesNotThrow(() => {
    assert.equal(controller.nudge(1, 0), false);
  });
  assert.deepEqual(rollbackCalls, [[transaction, { id: 'doc' }]]);
});

test('nudge controller fails closed before DOM mutation when canonical layout construction throws', () => {
  let applyCalls = 0;
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: { id: 'node-1' }, nextLeft: 12, nextTop: 14 }]
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
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    },
    finalizeDeckMutation: () => {
      throw new Error('should not finalize a failed nudge');
    }
  });

  assert.equal(controller.nudge(1, 0), false);
  assert.equal(applyCalls, 0);
});

test('nudge controller fails closed before DOM mutation when the canonical sidecar is null', () => {
  let applyCalls = 0;
  const controller = nudgeController.createStudioEditorNudgeController({
    nudgeApi: {
      buildStudioNudgedLayout() {
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
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    applyPositionLayout: () => {
      applyCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(controller.nudge(1, 0), false);
  assert.equal(applyCalls, 0);
});
