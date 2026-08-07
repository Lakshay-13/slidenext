const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
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
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
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
  const element = { dataset: { editorId: 'node-1' } };
  const result = canonicalLayout.buildStudioCanonicalLayoutMutation({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      return sourceDeck;
    },
    nextItems: [{
      element,
      nextAbsLeft: 40,
      nextAbsTop: 60
    }],
    getElementId: (node) => node.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].layout.x, 40);
  assert.equal(result.slides[0].nodes[0].layout.y, 60);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.x, null);
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
    canonicalDeckBeforeMutation: sourceDeck,
    orderedElements: [first, second]
  });

  assert.equal(result.slides[0].nodes[0].layout.zIndex, 4);
  assert.equal(result.slides[0].nodes[0].layout.x, null);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
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
