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

test('buildStudioCanonicalMetadataDeck fails closed when the canonical metadata mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalSlideMetadata() {
      throw new Error('canonical metadata mutation failed');
    }
  };

  const result = metadata.buildStudioCanonicalMetadataDeck({ id: 'slide-1' }, {
    notes: 'After'
  }, {
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1', notes: 'Before' }]
    })
  });

  assert.equal(result, null);
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

test('buildStudioCanonicalMetadataBaseline delegates baseline resolution to canonical state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  const getCanonicalDeckBaseline = () => sourceDeck;
  const buildCanonicalDeckBaseline = () => sourceDeck;
  let readerOptions = null;
  let readerDocument = null;
  const result = metadata.buildStudioCanonicalMetadataBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (documentRef) => {
          readerDocument = documentRef;
          return sourceDeck;
        };
      }
    },
    getCanonicalDeckBaseline,
    buildCanonicalDeckBaseline,
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(readerDocument, sourceDocument);
  assert.equal(readerOptions.getCanonicalDeckBaseline, getCanonicalDeckBaseline);
  assert.equal(readerOptions.buildCanonicalDeckBaseline, buildCanonicalDeckBaseline);
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
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

test('buildStudioCanonicalMetadataBaseline fails closed when a compatibility rebuild throws', () => {
  const result = metadata.buildStudioCanonicalMetadataBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('compatibility rebuild failed');
    }
  });

  assert.equal(result, null);
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
