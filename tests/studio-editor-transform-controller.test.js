const test = require('node:test');
const assert = require('node:assert/strict');
const transformController = require('../shared/studio-editor-transform-controller.js');

test('transform controller delegates modern transform and marquee setup with shared options', () => {
  const calls = [];
  const doc = { body: {} };
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
    dragStartThresholdPx: 3,
    minSizePx: 12,
    snapDistancePx: 8
  });

  assert.equal(controller.setup(doc), true);
  assert.equal(calls[0][0], 'finalizer');
  assert.equal(calls[1][0], 'transformOptions');
  assert.equal(calls[1][1].dragStartThresholdPx, 3);
  assert.equal(calls[1][1].getGridSizePx(), 20);
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
    }
  });

  assert.equal(controller.setup({ body: {} }), true);
  assert.equal(typeof builderOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(builderOptions.getCanonicalDeckBaseline(), liveCanonicalDeck);
});

test('transform controller fails closed when no transform factory is available', () => {
  const controller = transformController.createStudioEditorTransformController({});
  assert.equal(controller.setup({ body: {} }), false);
});
