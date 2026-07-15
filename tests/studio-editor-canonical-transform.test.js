const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalTransform = require('../shared/studio-editor-canonical-transform.js');

test('buildStudioCanonicalTransformBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalTransform.buildStudioCanonicalTransformBaseline({
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

test('buildStudioCanonicalTransformDeck fails closed when an adapter dependency is missing', () => {
  assert.equal(canonicalTransform.buildStudioCanonicalTransformDeck({}, {}), null);
});
