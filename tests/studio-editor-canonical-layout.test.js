const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalLayout = require('../shared/studio-editor-canonical-layout.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', layout: { zIndex: 0 } }]
    }]
  });
}

test('buildStudioCanonicalLayoutBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
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

test('buildStudioCanonicalLayoutBaseline prefers a valid live canonical deck', () => {
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline(documentRef) {
      assert.deepEqual(documentRef, { id: 'editor-doc' });
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return createSourceDeck();
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalLayoutBaseline prefers pending canonical state before the live baseline', () => {
  const pendingDeck = createSourceDeck();
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck(documentRef) {
      assert.deepEqual(documentRef, { id: 'editor-doc' });
      return pendingDeck;
    },
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return createSourceDeck();
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, pendingDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalLayoutBaseline delegates baseline resolution to the shared canonical-state reader', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let readerOptions = null;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
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
    getPendingCanonicalDeck() {
      return null;
    },
    buildCanonicalDeckBaseline() {
      return null;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(typeof readerOptions.getPendingCanonicalDeck, 'function');
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
  assert.equal(typeof readerOptions.buildCanonicalDeckBaseline, 'function');
});

test('buildStudioCanonicalLayoutBaseline prefers the shared canonical deck resolver', () => {
  const sourceDeck = createSourceDeck();
  let resolverOptions = null;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
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
    getPendingCanonicalDeck: () => null,
    buildCanonicalDeckBaseline: () => ({ invalid: true }),
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(typeof resolverOptions.getPendingCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.buildCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('buildStudioCanonicalLayoutBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  let rebuildOptions = null;
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(_sourceDocument, options) {
      rebuildCalls += 1;
      rebuildOptions = options;
      return { invalid: true };
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, null);
  assert.equal(rebuildCalls, 1);
  assert.deepEqual(rebuildOptions, { preferLiveCanonicalDeck: false });
});

test('buildStudioCanonicalLayoutBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalNodeLayout() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalLayout.buildStudioCanonicalLayoutBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalLayout.buildStudioCanonicalLayoutBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalLayoutBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalLayout.buildStudioCanonicalLayoutBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('legacy baseline failed');
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalLayoutDeck applies layout updates to the provided pre-mutation deck', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalLayout.buildStudioCanonicalLayoutDeck(
    [{ id: 'node-1', layout: { zIndex: 3 } }],
    {
      canonicalDeckApi: canonicalDeck,
      canonicalDeckBeforeMutation: sourceDeck
    }
  );

  assert.equal(result.slides[0].nodes[0].layout.zIndex, 3);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
});

test('buildStudioCanonicalLayoutDeck fails closed when the canonical layout mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalNodeLayout() {
      throw new Error('canonical layout mutation failed');
    }
  };

  const result = canonicalLayout.buildStudioCanonicalLayoutDeck(
    [{ id: 'node-1', layout: { x: 40 } }],
    {
      canonicalDeckApi: throwingCanonicalDeckApi,
      canonicalDeckBeforeMutation: createSourceDeck()
    }
  );

  assert.equal(result, null);
});

test('buildStudioCanonicalLayoutDeck supports a builder and fails closed without the update API', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalLayout.buildStudioCanonicalLayoutDeck(
    [{ id: 'node-1', layout: { x: 40 } }],
    {
      canonicalDeckApi: canonicalDeck,
      buildCanonicalDeck: () => sourceDeck
    }
  );

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(canonicalLayout.buildStudioCanonicalLayoutDeck([], { canonicalDeckApi: {} }), null);
});

test('buildStudioCanonicalLayoutMutation maps positioned items onto a fresh canonical deck', () => {
  const sourceDeck = createSourceDeck();
  let baselineBuildCount = 0;
  const element = { dataset: { editorId: 'node-1' } };
  const result = canonicalLayout.buildStudioCanonicalLayoutMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeckBaseline() {
      baselineBuildCount += 1;
      return sourceDeck;
    },
    buildCanonicalDeck() {
      throw new Error('DOM mutation builder should not provide the baseline');
    },
    nextItems: [{
      element,
      nextAbsLeft: 40,
      nextAbsTop: 60,
      nextWidth: 320,
      nextHeight: 72
    }],
    getElementId: (node) => node.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(result.slides[0].nodes[0].layout.y, 60);
  assert.equal(result.slides[0].nodes[0].layout.mode, 'absolute');
  assert.equal(result.slides[0].nodes[0].layout.width, 320);
  assert.equal(result.slides[0].nodes[0].layout.height, 72);
  assert.equal(baselineBuildCount, 1);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.x, null);
});

test('buildStudioCanonicalLayoutMutation accepts a pending baseline without a live reader', () => {
  const pendingDeck = createSourceDeck();
  const result = canonicalLayout.buildStudioCanonicalLayoutMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    nextItems: [{
      element: { dataset: { editorId: 'node-1' } },
      nextAbsLeft: 40,
      nextAbsTop: 60
    }]
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(result.slides[0].nodes[0].layout.y, 60);
  assert.equal(pendingDeck.slides[0].nodes[0].layout.x, null);
});

test('buildStudioCanonicalLayoutMutation fails closed when no positioned items are valid', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalLayout.buildStudioCanonicalLayoutMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      return sourceDeck;
    },
    nextItems: [{
      element: { dataset: {} },
      nextAbsLeft: NaN,
      nextAbsTop: 60
    }]
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalLayerOrderMutation maps z-indexes using the pre-mutation deck', () => {
  const sourceDeck = createSourceDeck();
  const first = {
    dataset: { editorId: 'node-1' },
    style: { zIndex: '4' }
  };
  const second = {
    dataset: { editorId: 'node-2' },
    style: { zIndex: '2' }
  };
  const result = canonicalLayout.buildStudioCanonicalLayerOrderMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    canonicalDeckBeforeMutation: sourceDeck,
    orderedElements: [first, second]
  });

  assert.equal(result.slides[0].nodes[0].layout.zIndex, 4);
  assert.equal(result.slides[0].nodes[0].layout.x, null);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
});

test('buildStudioCanonicalLayerOrderMutation maps the explicit next order without reading stale DOM z-indexes', () => {
  const sourceDeck = createSourceDeck();
  const first = {
    dataset: { editorId: 'node-1' },
    style: { zIndex: '99' }
  };
  const second = {
    dataset: { editorId: 'node-2' },
    style: { zIndex: '-20' }
  };

  const result = canonicalLayout.buildStudioCanonicalLayerOrderMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    orderedElements: [first, second],
    nextOrder: [second, first],
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].layout.zIndex, 1);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
});

test('buildStudioCanonicalLayerOrderMutation fails closed when no z-index updates are valid', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalLayout.buildStudioCanonicalLayerOrderMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    orderedElements: [{
      dataset: {},
      style: { zIndex: 'not-a-number' }
    }]
  });

  assert.equal(result, null);
});

test('createStudioCanonicalLayoutMutationBuilder shares canonical dependencies', () => {
  const sourceDeck = createSourceDeck();
  let builtFromDocument = null;
  const buildCanonicalLayoutMutation = canonicalLayout.createStudioCanonicalLayoutMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    }
  });

  const result = buildCanonicalLayoutMutation({
    sourceDocument: { id: 'editor-doc' },
    nextItems: [{
      element: { dataset: { editorId: 'node-1' } },
      nextAbsLeft: 40,
      nextAbsTop: 60
    }]
  });

  assert.equal(builtFromDocument.id, 'editor-doc');
  assert.equal(result.slides[0].nodes[0].layout.x, 40);
});

test('createStudioCanonicalLayoutMutationBuilder preserves pending canonical state', () => {
  const pendingDeck = createSourceDeck();
  const liveDeck = createSourceDeck();
  const buildCanonicalLayoutMutation = canonicalLayout.createStudioCanonicalLayoutMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline: () => liveDeck
  });

  const result = buildCanonicalLayoutMutation({
    sourceDocument: { id: 'editor-doc' },
    nextItems: [{
      element: { dataset: { editorId: 'node-1' } },
      nextAbsLeft: 40,
      nextAbsTop: 60
    }]
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(result.slides[0].nodes[0].layout.y, 60);
  assert.equal(pendingDeck.slides[0].nodes[0].layout.x, null);
  assert.equal(liveDeck.slides[0].nodes[0].layout.x, null);
});

test('createStudioCanonicalLayoutMutationBuilder falls back when the live baseline is invalid', () => {
  const sourceDeck = createSourceDeck();
  let fallbackBuildCount = 0;
  const buildCanonicalLayoutMutation = canonicalLayout.createStudioCanonicalLayoutMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline() {
      fallbackBuildCount += 1;
      return sourceDeck;
    }
  });

  const result = buildCanonicalLayoutMutation({
    sourceDocument: { id: 'editor-doc' },
    nextItems: [{
      element: { dataset: { editorId: 'node-1' } },
      nextAbsLeft: 40,
      nextAbsTop: 60
    }]
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(fallbackBuildCount, 1);
});

test('createStudioCanonicalLayoutMutationBuilder can use only a valid live baseline', () => {
  const liveDeck = createSourceDeck();
  const buildCanonicalLayoutMutation = canonicalLayout.createStudioCanonicalLayoutMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => liveDeck
  });

  const result = buildCanonicalLayoutMutation({
    sourceDocument: { id: 'editor-doc' },
    nextItems: [{
      element: { dataset: { editorId: 'node-1' } },
      nextAbsLeft: 40,
      nextAbsTop: 60
    }]
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(result.slides[0].nodes[0].layout.y, 60);
  assert.equal(liveDeck.slides[0].nodes[0].layout.x, null);
});

test('createStudioCanonicalLayerOrderMutationBuilder reuses an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  let buildCount = 0;
  const buildCanonicalLayerOrderMutation = canonicalLayout.createStudioCanonicalLayerOrderMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    }
  });

  const result = buildCanonicalLayerOrderMutation({
    canonicalDeckBeforeMutation: sourceDeck,
    orderedElements: [{
      dataset: { editorId: 'node-1' },
      style: { zIndex: '7' }
    }]
  });

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].nodes[0].layout.zIndex, 7);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
});

test('createStudioCanonicalLayerOrderMutationBuilder preserves pending baseline resolution', () => {
  const pendingDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let pendingDocument = null;
  const buildCanonicalLayerOrderMutation = canonicalLayout.createStudioCanonicalLayerOrderMutationBuilder({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck(documentRef) {
      pendingDocument = documentRef;
      return pendingDeck;
    }
  });

  const result = buildCanonicalLayerOrderMutation({
    sourceDocument,
    orderedElements: [{
      dataset: { editorId: 'node-1' },
      style: { zIndex: '7' }
    }]
  });

  assert.equal(pendingDocument, sourceDocument);
  assert.equal(result.slides[0].nodes[0].layout.zIndex, 7);
  assert.equal(pendingDeck.slides[0].nodes[0].layout.zIndex, 0);
});
