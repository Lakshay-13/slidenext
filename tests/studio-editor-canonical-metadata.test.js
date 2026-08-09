const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const metadata = require('../shared/studio-editor-canonical-metadata.js');

test('buildStudioCanonicalMetadataDeck applies a slide metadata patch to a supplied baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', notes: 'Before' }]
  });
  const slide = { id: 'slide-1' };
  const result = metadata.buildStudioCanonicalMetadataDeck(slide, {
    notes: 'After'
  }, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck
  });

  assert.equal(result.slides[0].notes, 'After');
  assert.equal(sourceDeck.slides[0].notes, 'Before');
});

test('buildStudioCanonicalMetadataBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', notes: 'Live' }]
  });
  let didBuildFromDocument = false;
  const result = metadata.buildStudioCanonicalMetadataBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalMetadataBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = metadata.buildStudioCanonicalMetadataBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => {
      rebuildCalls += 1;
      return { invalid: true };
    }
  });

  assert.equal(result, null);
  assert.equal(rebuildCalls, 1);
});

test('buildStudioCanonicalMetadataBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalSlideMetadata() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    metadata.buildStudioCanonicalMetadataBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    metadata.buildStudioCanonicalMetadataBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalMetadataBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = metadata.buildStudioCanonicalMetadataBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return sourceDeck;
    }
  });

  assert.equal(result, sourceDeck);
  assert.equal(didBuildFromDocument, true);
});

test('createStudioCanonicalMetadataMutationBuilders prefers the live canonical baseline builder', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', section: 'Before' }]
  });
  const calls = [];
  const builders = metadata.createStudioCanonicalMetadataMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      throw new Error('DOM-derived mutation builder should not build the baseline');
    },
    buildCanonicalDeckBaseline(sourceDocument) {
      calls.push(sourceDocument);
      return sourceDeck;
    }
  });

  const baseline = builders.buildCanonicalMetadataBaseline({ sourceDocument: { id: 'frame' } });
  const result = builders.buildCanonicalMetadataDeck({ id: 'slide-1' }, {
    section: 'After'
  }, {
    canonicalDeckBeforeMutation: baseline
  });

  assert.deepEqual(calls, [{ id: 'frame' }]);
  assert.equal(result.slides[0].section, 'After');
});
