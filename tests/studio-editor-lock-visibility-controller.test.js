const test = require('node:test');
const assert = require('node:assert/strict');
const lockVisibilityController = require('../shared/studio-editor-lock-visibility-controller.js');

test('lock and visibility controller builds sidecars and finalizes both toggles', () => {
  const calls = [];
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
      createStudioCanonicalVisibilityMutationBuilders() {
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
});

test('lock and visibility controller fails closed when plans or finalization are unavailable', () => {
  const controller = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: { buildStudioLockMutationPlan: () => ({ didChange: false }) },
    visibilityStateApi: { buildStudioVisibilityMutationPlan: () => ({ didChange: false }) }
  });

  assert.equal(controller.toggleLock(), false);
  assert.equal(controller.toggleVisibility(), false);
});
