const test = require('node:test');
const assert = require('node:assert/strict');
const styleController = require('../shared/studio-editor-style-controller.js');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

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

test('style controller preserves transaction finalization when canonical style construction throws', () => {
  const calls = [];
  const element = { dataset: { editorId: 'node-1' } };
  const transaction = { id: 'tx' };
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(selection) {
        return {
          canApply: true,
          selection,
          versionLabel: 'Auto: Styled Element'
        };
      }
    },
    canonicalStyleApi: {
      createStudioCanonicalStyleMutationBuilders() {
        return {
          buildCanonicalStyleMutation() {
            throw new Error('canonical style unavailable');
          }
        };
      }
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation: () => ({
      didApply: true,
      displayValue: '32',
      transaction
    }),
    finalizeDeckMutation: (label, options) => calls.push([label, options])
  });

  assert.doesNotThrow(() => assert.equal(controller.apply('size', '32'), true));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'Auto: Styled Element');
  assert.equal(calls[0][1].transaction, transaction);
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0][1], 'canonicalDeck'), false);
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
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => deck,
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
});

test('style controller delegates canonical lock baseline resolution to canonical state', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const documentRef = { id: 'doc' };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let readerOptions = null;
  let readerDocument = null;
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (sourceDocument) => {
          readerDocument = sourceDocument;
          return deck;
        };
      }
    },
    getCanonicalDeckBaseline() {
      throw new Error('custom reader should own baseline resolution');
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => documentRef,
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(readerDocument, documentRef);
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(receivedLockState, true);
});

test('style controller fails closed when the shared baseline reader is unavailable', () => {
  const element = { dataset: { editorId: 'node-1' } };
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader() {
        return null;
      }
    },
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => true
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
});

test('style controller rebuilds the canonical lock baseline when live state is invalid', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const rebuiltDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { locked: true } }]
    }]
  });
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => rebuiltDeck,
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
});

test('style controller rejects malformed canonical baselines before lock lookup', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const malformedDeck = { invalid: true };
  let didUseMalformedDeck = false;
  let receivedLockState = null;
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: (value) => (
      value
        && value.kind === 'slidenext.deck'
        && Array.isArray(value.slides)
        ? true
        : 1
    ),
    findCanonicalNodeById(deck) {
      if (deck === malformedDeck) didUseMalformedDeck = true;
      return null;
    }
  };
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: !receivedLockState };
      }
    },
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => malformedDeck,
    buildCanonicalDeckBaseline: () => malformedDeck,
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => true
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
  assert.equal(didUseMalformedDeck, false);
});

test('style controller rejects malformed baselines without a canonical validator', () => {
  const element = { dataset: { editorId: 'node-1' } };
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: false };
      }
    },
    canonicalDeckApi: {
      ...canonicalDeck,
      isCanonicalDeck: undefined
    },
    canonicalStateApi: {},
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => ({ invalid: true }),
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => true
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
});
