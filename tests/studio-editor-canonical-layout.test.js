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
