const test = require('node:test');
const assert = require('node:assert/strict');
const nudgeController = require('../shared/studio-editor-nudge-controller.js');

test('nudge controller assembles canonical layout and transaction dependencies', () => {
  const calls = [];
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
    buildMotionSelectionActionState: () => ({
      canNudge: true,
      doc: { id: 'doc' },
      nudgeLayoutItems: [{ id: 'item-1' }],
      slideBounds: { width: 1920, height: 1080 }
    }),
    assignElementId: () => 'node-1',
    buildCanonicalDeck: () => ({ slides: [] }),
    applyPositionLayout: (...args) => {
      calls.push(['position', ...args]);
      return { didApply: true, transaction: { id: 'position-transaction' } };
    },
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.nudge(2, -1), true);
  assert.equal(calls[0][0], 'build');
  assert.deepEqual(calls[0][2], { dx: 2, dy: -1 });
  assert.deepEqual(calls[0][3], { width: 1920, height: 1080 });
  assert.equal(calls[1][0], 'builder');
  assert.equal(calls[1][1].canonicalDeckApi.id, 'deck-api');
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
