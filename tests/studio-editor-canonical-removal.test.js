const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalRemoval = require('../shared/studio-editor-canonical-removal.js');

test('buildStudioCanonicalRemovalBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
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

test('buildStudioCanonicalRemovalBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  let didBuildFromDocument = false;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalRemovalBaseline delegates baseline resolution to canonical state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  const getCanonicalDeckBaseline = () => sourceDeck;
  const buildCanonicalDeckBaseline = () => sourceDeck;
  let readerOptions = null;
  let readerDocument = null;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
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

test('buildStudioCanonicalRemovalBaseline prefers the shared canonical deck resolver', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  let resolverOptions = null;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
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

test('buildStudioCanonicalRemovalBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
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

test('buildStudioCanonicalRemovalBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    removeCanonicalNodes() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalRemoval.buildStudioCanonicalRemovalBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalRemoval.buildStudioCanonicalRemovalBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalRemovalBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('compatibility rebuild failed');
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalRemovalDeck removes selected nodes without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1' }, { id: 'node-2' }, { id: 'after' }]
    }]
  });
  const result = canonicalRemoval.buildStudioCanonicalRemovalDeck(
    [{ dataset: { editorId: 'node-1' } }, { dataset: { editorId: 'node-2' } }],
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      canonicalDeckBeforeMutation: sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2', 'after']);
});

test('buildStudioCanonicalRemovalDeck fails closed when the canonical removal throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    removeCanonicalNodes() {
      throw new Error('canonical removal failed');
    }
  };

  const result = canonicalRemoval.buildStudioCanonicalRemovalDeck(
    [{ dataset: { editorId: 'node-1' } }],
    {
      canonicalDeckApi: throwingCanonicalDeckApi,
      canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
        slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
      }),
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result, null);
});

test('buildStudioCanonicalRemovalDeck fails closed without a model or selection', () => {
  assert.equal(canonicalRemoval.buildStudioCanonicalRemovalDeck([], {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({ slides: [] })
  }), null);
  assert.equal(canonicalRemoval.buildStudioCanonicalRemovalDeck([{ dataset: { editorId: 'node-1' } }], {}), null);
});

test('buildStudioCanonicalRemovalMutation centralizes baseline and node removal', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1' }, { id: 'after' }]
    }]
  });
  let baselineBuildCount = 0;
  const result = canonicalRemoval.buildStudioCanonicalRemovalMutation(
    [{ dataset: { editorId: 'node-1' } }],
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

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.equal(baselineBuildCount, 1);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'after']);
});

test('buildStudioCanonicalRemovalMutation can use only a valid live baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1' }, { id: 'after' }]
    }]
  });
  const result = canonicalRemoval.buildStudioCanonicalRemovalMutation(
    [{ dataset: { editorId: 'node-1' } }],
    {
      canonicalDeckApi: canonicalDeck,
      canonicalStateApi: canonicalState,
      getCanonicalDeckBaseline: () => liveDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.deepEqual(liveDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'after']);
});

test('buildStudioCanonicalRemovalMutation falls back when the live baseline is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }, { id: 'after' }] }]
  });
  let didBuildFromDocument = false;
  const result = canonicalRemoval.buildStudioCanonicalRemovalMutation(
    [{ dataset: { editorId: 'node-1' } }],
    {
      canonicalDeckApi: canonicalDeck,
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

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.equal(didBuildFromDocument, true);
});

test('createStudioCanonicalRemovalMutationBuilders reuses an explicit baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }, { id: 'node-2' }] }]
  });
  let buildCount = 0;
  const builders = canonicalRemoval.createStudioCanonicalRemovalMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalRemovalMutation(
    [{ dataset: { editorId: 'node-1' } }],
    {
      canonicalDeckBeforeMutation: sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(buildCount, 0);
  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['node-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2']);
});
