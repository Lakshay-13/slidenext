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
