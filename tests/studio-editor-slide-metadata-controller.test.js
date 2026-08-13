const test = require('node:test');
const assert = require('node:assert/strict');
const metadataController = require('../shared/studio-editor-slide-metadata-controller.js');

test('slide metadata controller assembles metadata and canonical dependencies', () => {
  const calls = [];
  const controller = metadataController.createStudioEditorSlideMetadataController({
    slideMetadataApi: {
      applyStudioActiveSlideMetadataEdit(value, options) {
        calls.push([value, options]);
        return true;
      }
    },
    metadataApi: { id: 'metadata-api' },
    metadataActions: { id: 'actions-api' },
    canonicalMetadataApi: { id: 'canonical-metadata-api' },
    canonicalDeckApi: { id: 'canonical-deck-api' },
    transactionApi: { id: 'transaction-api' },
    buildCanonicalDeck: () => ({ slides: [] }),
    getPendingCanonicalDeck: () => ({ id: 'pending-baseline' }),
    getCanonicalDeckBaseline: () => ({ id: 'live-baseline' }),
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    getElementId: () => 'slide:slide-1',
    finalizeMutation: () => {},
    syncChrome: () => {}
  });

  assert.equal(controller.apply('Research', {
    metadataMethod: 'applyStudioSlideSection',
    versionLabel: 'Auto: Updated Slide Section'
  }), true);

  const [value, options] = calls[0];
  assert.equal(value, 'Research');
  assert.equal(options.metadataApi.id, 'metadata-api');
  assert.equal(options.metadataActions.id, 'actions-api');
  assert.equal(options.canonicalMetadataApi.id, 'canonical-metadata-api');
  assert.equal(options.canonicalDeckApi.id, 'canonical-deck-api');
  assert.equal(options.transactionApi.id, 'transaction-api');
  assert.equal(options.getCanonicalDeckBaseline().id, 'live-baseline');
  assert.equal(options.getPendingCanonicalDeck().id, 'pending-baseline');
  assert.equal(options.metadataMethod, 'applyStudioSlideSection');
  assert.equal(options.versionLabel, 'Auto: Updated Slide Section');
  assert.equal(options.getDocument().id, 'doc');
  assert.equal(options.getActiveSlide().id, 'slide-1');
  assert.deepEqual(options.resolveReadyState(), { canUseDeckActions: true });
  assert.equal(options.getElementId(), 'slide:slide-1');
});

test('slide metadata controller fails closed without the shared metadata adapter', () => {
  const controller = metadataController.createStudioEditorSlideMetadataController({
    slideMetadataApi: null
  });

  assert.equal(controller.apply('Ignored'), false);
});
