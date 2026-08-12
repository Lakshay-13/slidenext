const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalTransform = require('../shared/studio-editor-canonical-transform.js');

test('buildStudioCanonicalTransformBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeckBaseline(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    buildCanonicalDeck() {
      throw new Error('DOM mutation builder should not provide the baseline');
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalTransformBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  let didBuildFromDocument = false;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline(documentRef) {
      assert.deepEqual(documentRef, { id: 'editor-doc' });
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [] });
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalTransformBaseline delegates baseline resolution to the shared canonical-state reader', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let readerOptions = null;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (documentRef) => {
          assert.equal(documentRef, sourceDocument);
          return sourceDeck;
        };
      }
    },
    getCanonicalDeckBaseline() {
      return null;
    },
    buildCanonicalDeckBaseline() {
      return null;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
  assert.equal(typeof readerOptions.buildCanonicalDeckBaseline, 'function');
});

test('buildStudioCanonicalTransformBaseline prefers the shared canonical deck resolver', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  let resolverOptions = null;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => sourceDeck;
      },
      createStudioEditorCanonicalDeckBaselineReader() {
        throw new Error('legacy baseline reader should not be used');
      }
    },
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => ({ invalid: true }),
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(typeof resolverOptions.buildCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('buildStudioCanonicalTransformBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  let didBuildFromDocument = false;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
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

test('buildStudioCanonicalTransformBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
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

test('buildStudioCanonicalTransformBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalNodeLayout() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalTransform.buildStudioCanonicalTransformBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalTransform.buildStudioCanonicalTransformBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalTransformBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('legacy baseline failed');
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalTransformBaseline disables live reuse for compatibility rebuilds', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let rebuildOptions = null;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(documentRef, options) {
      assert.equal(documentRef, sourceDocument);
      rebuildOptions = options;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.deepEqual(rebuildOptions, { preferLiveCanonicalDeck: false });
});

test('buildStudioCanonicalTransformDeck applies canonical layout updates to the current model', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', layout: { x: 10, y: 20 } }]
    }]
  });
  const finalizeResult = { session: { items: [{ element: { dataset: { editorId: 'node-1' } } }] } };

  const result = canonicalTransform.buildStudioCanonicalTransformDeck(finalizeResult, {
    canonicalDeckApi: canonicalDeck,
    buildCanonicalLayoutUpdates() {
      return [{ id: 'node-1', layout: { x: 80, y: 90 } }];
    },
    buildCanonicalDeck() {
      return sourceDeck;
    },
    getElementId(element) {
      return element.dataset.editorId;
    }
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 80);
  assert.equal(result.slides[0].nodes[0].layout.y, 90);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.x, 10);
});

test('buildStudioCanonicalTransformDeck fails closed when the canonical layout mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalNodeLayout() {
      throw new Error('canonical transform mutation failed');
    }
  };

  const result = canonicalTransform.buildStudioCanonicalTransformDeck({}, {
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
    }),
    buildCanonicalLayoutUpdates() {
      return [{ id: 'node-1', layout: { x: 80 } }];
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalTransformDeck fails closed when an adapter dependency is missing', () => {
  assert.equal(canonicalTransform.buildStudioCanonicalTransformDeck({}, {}), null);
});

test('buildStudioCanonicalTransformDeck fails closed when no layout updates are produced', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const result = canonicalTransform.buildStudioCanonicalTransformDeck({}, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    buildCanonicalLayoutUpdates() {
      return [];
    }
  });

  assert.equal(result, null);
});

test('createStudioCanonicalTransformMutationBuilders reuses an explicit baseline', () => {
  const explicitBaseline = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', layout: { x: 10, y: 20 } }] }]
  });
  let buildCount = 0;
  const builders = canonicalTransform.createStudioCanonicalTransformMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return explicitBaseline;
    },
    buildCanonicalLayoutUpdates() {
      return [{ id: 'node-1', layout: { x: 100, y: 120 } }];
    }
  });

  const result = builders.buildCanonicalTransformDeck({}, {
    canonicalDeckBeforeMutation: explicitBaseline
  });

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].nodes[0].layout.x, 100);
  assert.equal(explicitBaseline.slides[0].nodes[0].layout.x, 10);
});
