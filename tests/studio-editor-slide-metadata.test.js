const test = require('node:test');
const assert = require('node:assert/strict');

const slideMetadata = require('../shared/studio-editor-slide-metadata.js');

test('applyStudioActiveSlideMetadataEdit delegates metadata and canonical wiring', () => {
  const calls = [];
  const canonicalMetadataBuilders = {
    buildCanonicalMetadataBaseline() {
      return { id: 'before' };
    },
    buildCanonicalMetadataDeck() {
      return { id: 'after' };
    }
  };
  const buildCanonicalDeckBaseline = () => ({ id: 'baseline' });
  const getPendingCanonicalDeck = () => ({ id: 'pending-baseline' });
  const getCanonicalDeckBaseline = () => ({ id: 'live-baseline' });
  const metadataActions = {
    applyStudioSlideMetadataEdit(value, options) {
      calls.push([value, options]);
      return true;
    }
  };
  const result = slideMetadata.applyStudioActiveSlideMetadataEdit('Research', {
    metadataApi: { id: 'metadata' },
    metadataActions,
    canonicalMetadataApi: {
      createStudioCanonicalMetadataMutationBuilders(options) {
        calls.push(['builders', options]);
        return canonicalMetadataBuilders;
      }
    },
    canonicalDeckApi: { id: 'deck' },
    buildCanonicalDeck() {},
    buildCanonicalDeckBaseline,
    getPendingCanonicalDeck,
    getCanonicalDeckBaseline,
    resolveReadyState() {},
    getDocument() {},
    getActiveSlide() {},
    metadataMethod: 'applyStudioSlideSection',
    versionLabel: 'Auto: Updated Slide Section',
    transactionApi: { id: 'transaction' },
    getElementId() {},
    finalizeMutation() {},
    syncChrome() {}
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'builders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'deck');
  assert.equal(calls[1][0], 'Research');
  assert.equal(calls[1][1].metadataApi.id, 'metadata');
  assert.equal(calls[1][1].metadataMethod, 'applyStudioSlideSection');
  assert.equal(calls[1][1].canonicalMetadataKey, 'section');
  assert.equal(calls[1][1].buildCanonicalMetadataBaseline, canonicalMetadataBuilders.buildCanonicalMetadataBaseline);
  assert.equal(calls[1][1].buildCanonicalMetadataDeck, canonicalMetadataBuilders.buildCanonicalMetadataDeck);
  assert.equal(calls[0][1].buildCanonicalDeckBaseline, buildCanonicalDeckBaseline);
  assert.equal(calls[0][1].getCanonicalDeckBaseline, getCanonicalDeckBaseline);
  assert.equal(calls[0][1].getPendingCanonicalDeck, getPendingCanonicalDeck);
  assert.equal(calls[1][1].transactionApi.id, 'transaction');
});

test('applyStudioActiveSlideMetadataEdit fails closed without shared dependencies', () => {
  assert.equal(slideMetadata.applyStudioActiveSlideMetadataEdit('Ignored'), false);
  assert.equal(slideMetadata.applyStudioActiveSlideMetadataEdit('Ignored', {
    metadataApi: {},
    metadataActions: {}
  }), false);
});
