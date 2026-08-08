const test = require('node:test');
const assert = require('node:assert/strict');
const styleController = require('../shared/studio-editor-style-controller.js');
const canonicalDeck = require('../shared/canonical-deck.js');

test('style controller assembles mutation, feedback, canonical, and finalization dependencies', () => {
  const calls = [];
  const buildCanonicalDeckBaseline = () => ({ id: 'baseline' });
  const element = { dataset: { editorId: 'node-1' } };
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(selection, prop, value, options) {
        calls.push(['plan', selection, prop, value, options.canMutateDeck()]);
        return { canApply: true, selection, versionLabel: 'Auto: Styled Element' };
      },
      syncStudioStyleFeedbackLabel(options) {
        calls.push(['feedback', options]);
      }
    },
    canonicalStyleApi: {
      createStudioCanonicalStyleMutationBuilders(options) {
        calls.push(['builders', options]);
        return {
          buildCanonicalStyleBaseline: (options) => {
            calls.push(['baseline', options]);
            return { id: 'before' };
          },
          buildCanonicalStyleMutation: (options) => {
            calls.push(['canonical', options]);
            return { id: 'after' };
          }
        };
      }
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    assignElementId: () => 'node-1',
    buildCanonicalDeckBaseline,
    applyStyleMutation: (...args) => {
      calls.push(['apply', ...args]);
      return { didApply: true, displayValue: '32', transaction: { id: 'tx' } };
    },
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.apply('size', '32'), true);
  assert.equal(calls[0][0], 'plan');
  assert.equal(calls[0][2], 'size');
  assert.equal(calls[1][0], 'builders');
  assert.equal(calls[1][1].buildCanonicalDeckBaseline, buildCanonicalDeckBaseline);
  assert.equal(calls[2][0], 'baseline');
  assert.equal(calls[3][0], 'apply');
  assert.equal(calls[4][0], 'feedback');
  assert.equal(calls[5][0], 'canonical');
  assert.equal(calls[6][1], 'Auto: Styled Element');
  assert.deepEqual(calls[6][2].transaction, { id: 'tx' });
  assert.deepEqual(calls[6][2].canonicalDeck, { id: 'after' });
});

test('style controller refreshes inspector and fails closed for unavailable edits', () => {
  let syncCalls = 0;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan: () => ({ canApply: false })
    },
    syncInspectorForSelection: () => {
      syncCalls += 1;
    }
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(syncCalls, 1);
});

test('style controller blocks canonical-locked elements even when the DOM is stale', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { locked: true } }]
    }]
  });
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(selection, prop, value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: !receivedLockState };
      }
    },
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => deck,
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
});
