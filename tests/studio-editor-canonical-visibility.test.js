const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalVisibility = require('../shared/studio-editor-canonical-visibility.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { hidden: false, locked: false } }]
    }]
  });
}

test('buildStudioCanonicalVisibilityBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
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

test('buildStudioCanonicalVisibilityBaseline prefers a valid live canonical deck', () => {
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return createSourceDeck();
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalVisibilityBaseline delegates baseline resolution to canonical state', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  const getCanonicalDeckBaseline = () => sourceDeck;
  const buildCanonicalDeckBaseline = () => sourceDeck;
  let readerOptions = null;
  let readerDocument = null;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
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

test('buildStudioCanonicalVisibilityBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
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

test('buildStudioCanonicalVisibilityBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalNodeVisibility() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalVisibilityBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('compatibility rebuild failed');
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalVisibilityBaseline disables live reuse for compatibility rebuilds', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let rebuildOptions = null;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityBaseline({
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

test('buildStudioCanonicalVisibilityDeck applies hidden and locked patches without mutating the source', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalVisibility.buildStudioCanonicalVisibilityDeck(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true, locked: true },
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      buildCanonicalDeck: () => sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes[0].visibility, { hidden: true, locked: true });
  assert.deepEqual(sourceDeck.slides[0].nodes[0].visibility, { hidden: false, locked: false });
});

test('buildStudioCanonicalVisibilityDeck fails closed when the canonical visibility mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalNodeVisibility() {
      throw new Error('canonical visibility mutation failed');
    }
  };

  const result = canonicalVisibility.buildStudioCanonicalVisibilityDeck(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true },
    {
      canonicalDeckApi: throwingCanonicalDeckApi,
      canonicalDeckBeforeMutation: createSourceDeck(),
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result, null);
});

test('buildStudioCanonicalVisibilityDeck fails closed when the selection or adapter is unavailable', () => {
  assert.equal(canonicalVisibility.buildStudioCanonicalVisibilityDeck([], { hidden: true }, {
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck: createSourceDeck
  }), null);
  assert.equal(canonicalVisibility.buildStudioCanonicalVisibilityDeck([{ dataset: { editorId: 'node-1' } }], {
    hidden: true
  }, {}), null);
});

test('buildStudioCanonicalVisibilityMutation centralizes baseline and patch application', () => {
  const sourceDeck = createSourceDeck();
  let baselineBuildCount = 0;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityMutation(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true },
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      buildCanonicalDeckBaseline() {
        baselineBuildCount += 1;
        return sourceDeck;
      },
      buildCanonicalDeck() {
        throw new Error('DOM mutation builder should not provide the baseline');
      },
      sourceDocument: { id: 'editor-doc' },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.slides[0].nodes[0].visibility.hidden, true);
  assert.equal(baselineBuildCount, 1);
  assert.equal(sourceDeck.slides[0].nodes[0].visibility.hidden, false);
});

test('buildStudioCanonicalVisibilityMutation can use only a valid live baseline', () => {
  const liveDeck = createSourceDeck();
  const result = canonicalVisibility.buildStudioCanonicalVisibilityMutation(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true },
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      getCanonicalDeckBaseline: () => liveDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.slides[0].nodes[0].visibility.hidden, true);
  assert.equal(liveDeck.slides[0].nodes[0].visibility.hidden, false);
});

test('buildStudioCanonicalVisibilityMutation falls back when the live baseline is invalid', () => {
  const sourceDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalVisibility.buildStudioCanonicalVisibilityMutation(
    [{ dataset: { editorId: 'node-1' } }],
    { locked: true },
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      getCanonicalDeckBaseline() {
        return { invalid: true };
      },
      buildCanonicalDeckBaseline() {
        didBuildFromDocument = true;
        return sourceDeck;
      },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.slides[0].nodes[0].visibility.locked, true);
  assert.equal(didBuildFromDocument, true);
});

test('createStudioCanonicalVisibilityMutationBuilders reuses an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  let buildCount = 0;
  const builders = canonicalVisibility.createStudioCanonicalVisibilityMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalVisibilityMutation(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true },
    {
      canonicalDeckBeforeMutation: sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].nodes[0].visibility.hidden, true);
  assert.equal(sourceDeck.slides[0].nodes[0].visibility.hidden, false);
});
