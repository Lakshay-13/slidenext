const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
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
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalVisibilityDeck applies hidden and locked patches without mutating the source', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalVisibility.buildStudioCanonicalVisibilityDeck(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true, locked: true },
    {
      canonicalDeckApi: canonicalDeck,
      buildCanonicalDeck: () => sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes[0].visibility, { hidden: true, locked: true });
  assert.deepEqual(sourceDeck.slides[0].nodes[0].visibility, { hidden: false, locked: false });
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
  const result = canonicalVisibility.buildStudioCanonicalVisibilityMutation(
    [{ dataset: { editorId: 'node-1' } }],
    { hidden: true },
    {
      canonicalDeckApi: canonicalDeck,
      buildCanonicalDeck: () => sourceDeck,
      sourceDocument: { id: 'editor-doc' },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.slides[0].nodes[0].visibility.hidden, true);
  assert.equal(sourceDeck.slides[0].nodes[0].visibility.hidden, false);
});
