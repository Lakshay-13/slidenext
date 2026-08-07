const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalInsertion = require('../shared/studio-editor-canonical-insertion.js');

test('buildStudioCanonicalInsertionDeck imports and appends a new node without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
  });
  const element = { dataset: { editorId: 'inserted' } };
  const result = canonicalInsertion.buildStudioCanonicalInsertionDeck(element, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    slideId: 'slide-1',
    importElementToCanonicalNode(node, options) {
      return { id: options.getNodeId(node), text: 'Inserted' };
    },
    getNodeId: (node) => node.dataset.editorId
  });

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['existing', 'inserted']);
  assert.equal(sourceDeck.slides[0].nodes.length, 1);
});

test('buildStudioCanonicalInsertionDeck fails closed when insertion dependencies are missing', () => {
  assert.equal(canonicalInsertion.buildStudioCanonicalInsertionDeck(null, {}), null);
  assert.equal(canonicalInsertion.buildStudioCanonicalInsertionDeck({ dataset: { editorId: 'inserted' } }, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({ slides: [] }),
    slideId: 'slide-1'
  }), null);
});

test('buildStudioCanonicalInsertionDeck builds the baseline from the source document when needed', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalInsertion.buildStudioCanonicalInsertionDeck(
    { dataset: { editorId: 'inserted' } },
    {
      canonicalDeckApi: canonicalDeck,
      buildCanonicalDeck(documentRef) {
        builtFromDocument = documentRef;
        return sourceDeck;
      },
      sourceDocument,
      slideId: 'slide-1',
      importElementToCanonicalNode(element, options) {
        return { id: options.getNodeId(element), text: 'Inserted' };
      },
      getNodeId: (node) => node.dataset.editorId
    }
  );

  assert.equal(builtFromDocument, sourceDocument);
  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['inserted']);
});

test('createStudioCanonicalInsertionMutationBuilders preserves an explicit baseline', () => {
  const explicitBaseline = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
  });
  let buildCount = 0;
  const builders = canonicalInsertion.createStudioCanonicalInsertionMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      buildCount += 1;
      return explicitBaseline;
    },
    importElementToCanonicalNode(element, options) {
      return { id: options.getNodeId(element), text: 'Inserted' };
    }
  });

  const result = builders.buildCanonicalInsertionDeck(
    { dataset: { editorId: 'inserted' } },
    {
      canonicalDeckBeforeMutation: explicitBaseline,
      slideId: 'slide-1',
      getNodeId: (node) => node.dataset.editorId
    }
  );

  assert.equal(buildCount, 0);
  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['existing', 'inserted']);
});

test('buildStudioCanonicalInsertionSequence appends every inserted node in order', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
  });
  const elements = [
    { dataset: { editorId: 'inserted-1' } },
    { dataset: { editorId: 'inserted-2' } }
  ];

  const result = canonicalInsertion.buildStudioCanonicalInsertionSequence(elements, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    slideId: 'slide-1',
    importElementToCanonicalNode(element, options) {
      return { id: options.getNodeId(element) };
    },
    getNodeId: (element) => element.dataset.editorId
  });

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), [
    'existing',
    'inserted-1',
    'inserted-2'
  ]);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['existing']);
});
