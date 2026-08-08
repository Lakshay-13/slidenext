const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const lockVisibilityController = require('../shared/studio-editor-lock-visibility-controller.js');

test('lock and visibility controller builds sidecars and finalizes both toggles', () => {
  const calls = [];
  let builderOptions = null;
  const selected = [{ id: 'node-1', dataset: { editorId: 'node-1' } }];
  const controller = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: {
      buildStudioLockMutationPlan(elements, options) {
        calls.push(['lockPlan', elements, options.canMutateDeck()]);
        return { didChange: true, selection: elements, shouldLock: true, versionLabel: 'Auto: Locked Element' };
      }
    },
    visibilityStateApi: {
      buildStudioVisibilityMutationPlan(elements, options) {
        calls.push(['visibilityPlan', elements, options.canMutateDeck()]);
        return { didChange: true, selection: elements, shouldHide: true, versionLabel: 'Auto: Hid Element' };
      }
    },
    canonicalVisibilityApi: {
      createStudioCanonicalVisibilityMutationBuilders(options) {
        builderOptions = options;
        return {
          buildCanonicalVisibilityMutation(selection, state, options) {
            calls.push(['canonical', selection, state, options]);
            return { id: 'canonical-deck' };
          }
        };
      }
    },
    getSelectedElements: () => selected,
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    assignLockElementId: (element) => element.dataset.editorId,
    assignVisibilityElementId: (element) => element.dataset.editorId,
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    applyLockMutation: (...args) => {
      calls.push(['lockMutation', ...args]);
      return { didApply: true, transaction: { id: 'lock-tx' } };
    },
    applyVisibilityMutation: (...args) => {
      calls.push(['visibilityMutation', ...args]);
      return { didApply: true, transaction: { id: 'visibility-tx' } };
    },
    finalizeSelectionToggleMutation: (label, options) => {
      calls.push(['finalize', label, options]);
      return true;
    }
  });

  assert.equal(controller.toggleLock(), true);
  assert.equal(controller.toggleVisibility({ skipSelectionUi: true }), true);
  assert.equal(calls[0][0], 'lockPlan');
  assert.equal(calls[0][2], true);
  assert.equal(calls[1][0], 'canonical');
  assert.deepEqual(calls[1][2], { locked: true });
  assert.equal(calls[2][0], 'lockMutation');
  assert.equal(calls[3][0], 'finalize');
  assert.equal(calls[3][1], 'Auto: Locked Element');
  assert.equal(calls[4][0], 'visibilityPlan');
  assert.equal(calls[5][0], 'canonical');
  assert.deepEqual(calls[5][2], { hidden: true });
  assert.equal(calls[6][0], 'visibilityMutation');
  assert.equal(calls[7][0], 'finalize');
  assert.equal(calls[7][1], 'Auto: Hid Element');
  assert.equal(calls[7][2].skipSelectionUi, true);
  assert.equal(typeof builderOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof builderOptions.buildCanonicalDeckBaseline, 'function');
});

test('lock and visibility controller fails closed when plans or finalization are unavailable', () => {
  const controller = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: { buildStudioLockMutationPlan: () => ({ didChange: false }) },
    visibilityStateApi: { buildStudioVisibilityMutationPlan: () => ({ didChange: false }) }
  });

  assert.equal(controller.toggleLock(), false);
  assert.equal(controller.toggleVisibility(), false);
});

test('lock and visibility mutation plans prefer canonical metadata over stale DOM state', () => {
  const selected = [{ isConnected: true, dataset: { editorId: 'node-1' } }];
  const canonicalDeckModel = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        visibility: { locked: true, hidden: true }
      }]
    }]
  });
  const planReaders = {};
  let finalized = 0;
  const controller = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: {
      buildStudioLockMutationPlan(elements, options) {
        planReaders.locked = options.isLocked;
        assert.equal(options.isLocked(elements[0]), true);
        return {
          selection: elements,
          shouldLock: false,
          didChange: true,
          versionLabel: 'Auto: Unlocked Element'
        };
      }
    },
    visibilityStateApi: {
      buildStudioVisibilityMutationPlan(elements, options) {
        planReaders.hidden = options.isHidden;
        assert.equal(options.isHidden(elements[0]), true);
        return {
          selection: elements,
          shouldHide: false,
          didChange: true,
          versionLabel: 'Auto: Showed Element'
        };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getSelectedElements: () => selected,
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isLocked: () => false,
    isHidden: () => false,
    getCanonicalDeckBaseline: () => canonicalDeckModel,
    applyLockMutation(elements, shouldLock, options) {
      assert.equal(options.isLocked(elements[0]), true);
      return { didApply: true, transaction: { id: 'lock' } };
    },
    applyVisibilityMutation(elements, shouldHide, options) {
      assert.equal(options.isHidden(elements[0]), true);
      return { didApply: true, transaction: { id: 'visibility' } };
    },
    finalizeSelectionToggleMutation() {
      finalized += 1;
      return true;
    }
  });

  assert.equal(controller.toggleLock(), true);
  assert.equal(controller.toggleVisibility(), true);
  assert.equal(typeof planReaders.locked, 'function');
  assert.equal(typeof planReaders.hidden, 'function');
  assert.equal(finalized, 2);
});
