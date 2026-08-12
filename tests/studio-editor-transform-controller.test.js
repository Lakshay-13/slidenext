const test = require('node:test');
const assert = require('node:assert/strict');
const transformController = require('../shared/studio-editor-transform-controller.js');
const transformState = require('../shared/studio-editor-transform.js');
const transactionState = require('../shared/studio-editor-transaction.js');

test('transform controller delegates modern transform and marquee setup with shared options', () => {
  const calls = [];
  const doc = { body: {} };
  const isFreeformPositioned = () => true;
  const controller = transformController.createStudioEditorTransformController({
    transformApi: {
      createStudioTransformSessionFinalizer(options) {
        calls.push(['finalizer', options]);
        return () => {};
      }
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        calls.push(['transformOptions', options]);
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions(options) {
        calls.push(['marqueeOptions', options]);
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers(currentDoc, options) {
        calls.push(['attach', currentDoc, options]);
        return true;
      }
    },
    getGridSizePx: () => 20,
    isFreeformPositioned,
    dragStartThresholdPx: 3,
    minSizePx: 12,
    snapDistancePx: 8
  });

  assert.equal(controller.setup(doc), true);
  assert.equal(calls[0][0], 'finalizer');
  assert.equal(calls[1][0], 'transformOptions');
  assert.equal(calls[1][1].dragStartThresholdPx, 3);
  assert.equal(calls[1][1].getGridSizePx(), 20);
  assert.equal(calls[1][1].itemOptions.isFreeformPositioned, isFreeformPositioned);
  assert.equal(calls[2][0], 'marqueeOptions');
  assert.equal(calls[3][0], 'attach');
  assert.equal(calls[3][1], doc);
  assert.deepEqual(calls[3][2], {
    transformOptions: { kind: 'transform' },
    marqueeOptions: { kind: 'marquee' }
  });
});

test('transform controller forwards the live canonical baseline reader', () => {
  let builderOptions = null;
  let forwardedBuildOptions = null;
  const liveCanonicalDeck = { kind: 'live-deck' };
  const controller = transformController.createStudioEditorTransformController({
    transformApi: {
      createStudioTransformSessionFinalizer() {
        return () => {};
      },
      buildStudioTransformCanonicalLayoutUpdates() {
        return [];
      }
    },
    canonicalTransformApi: {
      createStudioCanonicalTransformMutationBuilders(options) {
        builderOptions = options;
        return {
          buildCanonicalTransformBaseline() {
            return options.getCanonicalDeckBaseline({ id: 'editor-doc' });
          },
          buildCanonicalTransformDeck() {
            return null;
          }
        };
      }
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        options.onSessionStart({ id: 'start-bounds' });
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions() {
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    },
    getCanonicalDeckBaseline() {
      return liveCanonicalDeck;
    },
    buildCanonicalDeckBaseline(sourceDocument, buildOptions) {
      forwardedBuildOptions = { sourceDocument, buildOptions };
      return { kind: 'rebuilt-deck' };
    }
  });

  assert.equal(controller.setup({ body: {} }), true);
  assert.equal(typeof builderOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(builderOptions.getCanonicalDeckBaseline(), liveCanonicalDeck);
  const sourceDocument = { id: 'fallback-doc' };
  assert.deepEqual(
    builderOptions.buildCanonicalDeckBaseline(sourceDocument, { preferLiveCanonicalDeck: false }),
    { kind: 'rebuilt-deck' }
  );
  assert.deepEqual(forwardedBuildOptions, {
    sourceDocument,
    buildOptions: { preferLiveCanonicalDeck: false }
  });
});

test('transform controller rolls back a DOM transaction when a canonical transform fails', () => {
  const doc = { body: {} };
  const canonicalBaseline = { kind: 'slidenext.deck', slides: [] };
  const transaction = { kind: 'style-transaction' };
  const element = { id: 'node-1' };
  let finalizerOptions = null;
  const rollbackCalls = [];
  let syncOverlayCalls = 0;
  let syncInspectorCalls = 0;
  const controller = transformController.createStudioEditorTransformController({
    transformApi: {
      buildStudioTransformCanonicalLayoutUpdates() {
        return [];
      },
      createStudioTransformSessionFinalizer(options) {
        finalizerOptions = options;
        return () => {};
      }
    },
    canonicalTransformApi: {
      createStudioCanonicalTransformMutationBuilders() {
        return {
          buildCanonicalTransformBaseline() {
            return canonicalBaseline;
          },
          buildCanonicalTransformDeck() {
            return null;
          }
        };
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
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        options.onSessionStart({ id: 'start-bounds' });
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions() {
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    },
    syncSelectionOverlay() {
      syncOverlayCalls += 1;
    },
    syncInspectorForSelection() {
      syncInspectorCalls += 1;
    }
  });

  assert.equal(controller.setup(doc), true);
  assert.equal(finalizerOptions.requireCanonicalDeck(), true);
  assert.equal(finalizerOptions.onHistoryFailure, finalizerOptions.onCanonicalFailure);
  assert.equal(finalizerOptions.onCanonicalFailure({ transaction }), true);
  assert.deepEqual(rollbackCalls, [{ currentTransaction: transaction, direction: 'undo', element }]);
  assert.equal(finalizerOptions.requireCanonicalDeck(), false);
  assert.equal(syncOverlayCalls, 1);
  assert.equal(syncInspectorCalls, 1);
});

test('transform controller rolls back DOM styles when history capture fails', () => {
  const doc = { body: {} };
  const element = {
    dataset: { editorId: 'node-1' },
    style: {
      position: 'absolute',
      margin: '0px',
      left: '120px',
      top: '90px',
      width: '240px',
      height: '120px'
    }
  };
  let finalizeTransformSession = null;
  let historyCaptureCalls = 0;
  let syncOverlayCalls = 0;
  let syncInspectorCalls = 0;
  const controller = transformController.createStudioEditorTransformController({
    transformApi: {
      buildStudioTransformStyleTransaction: transformState.buildStudioTransformStyleTransaction,
      createStudioTransformSessionFinalizer(options) {
        finalizeTransformSession = transformState.createStudioTransformSessionFinalizer(options);
        return finalizeTransformSession;
      }
    },
    transactionApi: transactionState,
    domApi: {
      getElementByEditorId(elementId, currentDoc) {
        assert.equal(elementId, 'node-1');
        assert.equal(currentDoc, doc);
        return element;
      }
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions() {
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions() {
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    },
    saveHistoryState() {
      historyCaptureCalls += 1;
      return { didCapture: false };
    },
    syncSelectionOverlay() {
      syncOverlayCalls += 1;
    },
    syncInspectorForSelection() {
      syncInspectorCalls += 1;
    }
  });

  assert.equal(controller.setup(doc), true);
  assert.ok(finalizeTransformSession);
  assert.equal(finalizeTransformSession({
    session: {
      items: [{
        element,
        startStyle: {
          position: 'absolute',
          margin: '0px',
          left: '20px',
          top: '30px',
          width: '240px',
          height: '120px'
        }
      }]
    }
  }, {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  }), false);
  assert.equal(historyCaptureCalls, 1);
  assert.equal(element.style.left, '20px');
  assert.equal(element.style.top, '30px');
  assert.equal(element.style.width, '240px');
  assert.equal(element.style.height, '120px');
  assert.equal(syncOverlayCalls, 2);
  assert.equal(syncInspectorCalls, 2);
});

test('transform controller continues setup when canonical baseline capture throws', () => {
  const calls = [];
  const controller = transformController.createStudioEditorTransformController({
    canonicalTransformApi: {
      createStudioCanonicalTransformMutationBuilders() {
        throw new Error('canonical transform builders unavailable');
      }
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        options.onSessionStart({ id: 'start-bounds' });
        calls.push('transform-options');
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions() {
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        calls.push('attached');
        return true;
      }
    }
  });

  assert.doesNotThrow(() => assert.equal(controller.setup({ body: {} }), true));
  assert.deepEqual(calls, ['transform-options', 'attached']);
});

test('transform controller fails closed when no transform factory is available', () => {
  const controller = transformController.createStudioEditorTransformController({ transformApi: null });
  assert.equal(controller.setup({ body: {} }), false);
});

test('transform controller forwards canonical hidden state to transform and marquee options', () => {
  const doc = { body: {} };
  let transformHiddenReader = null;
  let marqueeHiddenReader = null;
  const controller = transformController.createStudioEditorTransformController({
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        transformHiddenReader = options.isHidden;
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions(options) {
        marqueeHiddenReader = options.isHidden;
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    },
    isHidden: () => false,
    getCanonicalVisibilityReader(property, currentDoc) {
      assert.equal(property, 'hidden');
      assert.equal(currentDoc, doc);
      return () => true;
    }
  });

  assert.equal(controller.setup(doc), true);
  assert.equal(transformHiddenReader({ id: 'node-1' }), true);
  assert.equal(marqueeHiddenReader({ id: 'node-1' }), true);
});

test('transform controller binds marquee selection reads to the setup document', () => {
  const doc = { body: {} };
  const selectedElements = [{ id: 'selected' }];
  let marqueeOptions = null;
  const controller = transformController.createStudioEditorTransformController({
    getSelectedElements(currentDoc) {
      assert.equal(currentDoc, doc);
      return selectedElements;
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions() {
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions(options) {
        marqueeOptions = options;
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    }
  });

  assert.equal(controller.setup(doc), true);
  assert.deepEqual(marqueeOptions.getSelectedElements(), selectedElements);
});

test('transform controller binds overlay creation to the setup document', () => {
  const doc = { body: {} };
  const slide = { id: 'slide-1' };
  let transformOptions = null;
  const controller = transformController.createStudioEditorTransformController({
    ensureOverlay(currentSlide, currentDoc) {
      assert.equal(currentSlide, slide);
      assert.equal(currentDoc, doc);
      return 'overlay';
    },
    interactionOptionsApi: {
      buildStudioTransformInteractionOptions(options) {
        transformOptions = options;
        return { kind: 'transform' };
      },
      buildStudioMarqueeInteractionOptions() {
        return { kind: 'marquee' };
      }
    },
    interactionsApi: {
      attachStudioEditorInteractionHandlers() {
        return true;
      }
    }
  });

  assert.equal(controller.setup(doc), true);
  assert.equal(transformOptions.ensureOverlay(slide), 'overlay');
});
