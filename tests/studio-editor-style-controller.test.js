const test = require('node:test');
const assert = require('node:assert/strict');
const styleController = require('../shared/studio-editor-style-controller.js');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

test('style controller assembles mutation, feedback, canonical, and finalization dependencies', () => {
  const calls = [];
  const buildCanonicalDeck = () => ({ id: 'live' });
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
    buildCanonicalDeck,
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
  assert.equal(calls[1][1].buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(calls[1][1].buildCanonicalDeckBaseline, buildCanonicalDeckBaseline);
  assert.equal(calls[2][0], 'baseline');
  assert.equal(calls[3][0], 'apply');
  assert.equal(calls[4][0], 'feedback');
  assert.equal(calls[5][0], 'canonical');
  assert.equal(calls[6][1], 'Auto: Styled Element');
  assert.deepEqual(calls[6][2].transaction, { id: 'tx' });
  assert.deepEqual(calls[6][2].canonicalDeck, { id: 'after' });
});

test('style controller reads selection from the active iframe document', () => {
  const documentRef = { id: 'active-document' };
  let receivedDocument = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(selection) {
        assert.deepEqual(selection, [{ id: 'node-1' }]);
        return { canApply: false };
      }
    },
    getSelectedElements(doc) {
      receivedDocument = doc;
      return [{ id: 'node-1' }];
    },
    getIframeDoc: () => documentRef,
    getActiveSlide: () => ({ id: 'slide-1' })
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedDocument, documentRef);
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

test('style controller rolls back a canonical-backed mutation when its sidecar fails', () => {
  const doc = { id: 'doc' };
  const element = { dataset: { editorId: 'node-1' } };
  const transaction = { id: 'tx' };
  const rollbackCalls = [];
  let finalizeCalls = 0;
  let syncCalls = 0;
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
          buildCanonicalStyleBaseline() {
            return { id: 'before' };
          },
          buildCanonicalStyleMutation() {
            return null;
          }
        };
      }
    },
    transactionApi: {
      applyStudioEditorTransaction(currentTransaction, direction, options) {
        rollbackCalls.push({
          currentTransaction,
          direction,
          element: options.getElementById('node-1')
        });
        return { didApply: true };
      }
    },
    domApi: {
      getElementByEditorId(elementId, currentDoc) {
        assert.equal(elementId, 'node-1');
        assert.equal(currentDoc, doc);
        return element;
      }
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => doc,
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation: () => ({
      didApply: true,
      displayValue: '32',
      transaction
    }),
    syncInspectorForSelection: () => {
      syncCalls += 1;
    },
    finalizeDeckMutation: () => {
      finalizeCalls += 1;
    }
  });

  assert.equal(controller.apply('size', '32'), false);
  assert.deepEqual(rollbackCalls, [{ currentTransaction: transaction, direction: 'undo', element }]);
  assert.equal(finalizeCalls, 0);
  assert.equal(syncCalls, 2);
});

test('style controller fails closed before DOM mutation when canonical builder construction throws', () => {
  let styleCalls = 0;
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
        throw new Error('canonical style builders unavailable');
      }
    },
    getSelectedElements: () => [{ id: 'node-1' }],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation: () => {
      styleCalls += 1;
      return { didApply: true, displayValue: '32', transaction: null };
    }
  });

  assert.equal(controller.apply('size', '32'), false);
  assert.equal(styleCalls, 0);
});

test('style controller fails closed before mutation when finalization is unavailable', () => {
  let styleCalls = 0;
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
    getSelectedElements: () => [{ id: 'node-1' }],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation: () => {
      styleCalls += 1;
      return { didApply: true, displayValue: '32', transaction: null };
    }
  });

  assert.equal(controller.apply('size', '32'), false);
  assert.equal(styleCalls, 0);
});

test('style controller rolls back when finalization rejects the mutation', () => {
  const doc = { id: 'doc' };
  const element = { dataset: { editorId: 'node-1' } };
  const transaction = { id: 'tx' };
  const rollbackCalls = [];
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(selection) {
        return { canApply: true, selection, versionLabel: 'Auto: Styled Element' };
      }
    },
    transactionApi: {
      applyStudioEditorTransaction(currentTransaction, direction, options) {
        rollbackCalls.push({ currentTransaction, direction, element: options.getElementById('node-1') });
        return { didApply: true };
      }
    },
    domApi: {
      getElementByEditorId(elementId, currentDoc) {
        assert.equal(elementId, 'node-1');
        assert.equal(currentDoc, doc);
        return element;
      }
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => doc,
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation: () => ({ didApply: true, displayValue: '32', transaction }),
    finalizeDeckMutation: () => false
  });

  assert.equal(controller.apply('size', '32'), false);
  assert.deepEqual(rollbackCalls, [{ currentTransaction: transaction, direction: 'undo', element }]);
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

test('style controller contains mutation-plan failures before touching the live selection', () => {
  let applyCalls = 0;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan() {
        throw new Error('inspector plan failed');
      }
    },
    getSelectedElements: () => [{ id: 'node-1' }],
    applyStyleMutation() {
      applyCalls += 1;
      return { didApply: true };
    }
  });

  assert.doesNotThrow(() => assert.equal(controller.apply('color', '#fff'), false));
  assert.equal(applyCalls, 0);
});

test('style controller contains injected mutation failures and skips finalization', () => {
  let finalizeCalls = 0;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        assert.equal(options.canMutateDeck(), true);
        return { canApply: true, selection: [{ id: 'node-1' }] };
      }
    },
    getSelectedElements: () => [{ id: 'node-1' }],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    applyStyleMutation() {
      throw new Error('style adapter failed');
    },
    finalizeDeckMutation() {
      finalizeCalls += 1;
    }
  });

  assert.doesNotThrow(() => assert.equal(controller.apply('color', '#fff'), false));
  assert.equal(finalizeCalls, 0);
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

test('style controller uses the shared canonical deck resolver', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let resolverOptions = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        assert.equal(options.isLocked(element), true);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => deck;
      },
      createStudioEditorCanonicalVisibilityReaderForDeck() {
        return () => true;
      }
    },
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => ({ invalid: true }),
    getSelectedElements: () => [element],
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(typeof resolverOptions.buildCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('style controller delegates locked visibility assembly to canonical state', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const documentRef = { id: 'doc' };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let readerDeck = null;
  let readerOptions = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        assert.equal(options.isLocked(element), true);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader() {
        return () => deck;
      },
      createStudioEditorCanonicalVisibilityReaderForDeck(value, options) {
        readerDeck = value;
        readerOptions = options;
        return () => true;
      }
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => documentRef,
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(readerDeck, deck);
  assert.equal(readerOptions.property, 'locked');
  assert.equal(readerOptions.canonicalDeckApi, canonicalDeck);
  assert.equal(readerOptions.getElementId(element), 'node-1');
  assert.equal(readerOptions.fallbackReader(element), false);
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

test('style controller disables live reuse for compatibility lock rebuilds', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const documentRef = { id: 'doc' };
  const rebuiltDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let rebuildOptions = null;
  let receivedLockState = null;
  const controller = styleController.createStudioEditorStyleController({
    styleApi: {
      buildStudioStyleMutationPlan(_selection, _prop, _value, options) {
        receivedLockState = options.isLocked(element);
        return { canApply: false };
      }
    },
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {},
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(sourceDocument, options) {
      assert.equal(sourceDocument, documentRef);
      rebuildOptions = options;
      return rebuiltDeck;
    },
    getSelectedElements: () => [element],
    getIframeDoc: () => documentRef,
    getActiveSlide: () => ({ id: 'slide-1' }),
    isElementLocked: () => false
  });

  assert.equal(controller.apply('color', '#fff'), false);
  assert.equal(receivedLockState, true);
  assert.deepEqual(rebuildOptions, { preferLiveCanonicalDeck: false });
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
