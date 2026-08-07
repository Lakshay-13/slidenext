const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalRemoval = require('../shared/studio-editor-canonical-removal.js');

test('buildStudioCanonicalRemovalBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalRemoval.buildStudioCanonicalRemovalBaseline({
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
      canonicalDeckBeforeMutation: sourceDeck,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2', 'after']);
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
  const result = canonicalRemoval.buildStudioCanonicalRemovalMutation(
    [{ dataset: { editorId: 'node-1' } }],
    {
      canonicalDeckApi: canonicalDeck,
      buildCanonicalDeck: () => sourceDeck,
      sourceDocument: { id: 'editor-doc' },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['after']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'after']);
});
