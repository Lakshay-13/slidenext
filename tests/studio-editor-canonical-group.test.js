const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalGroup = require('../shared/studio-editor-canonical-group.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1' }, { id: 'node-2' }, { id: 'after' }]
    }]
  });
}

test('buildStudioCanonicalGroupDeck imports and groups selected nodes without mutating the source', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalGroup.buildStudioCanonicalGroupDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    slideId: 'slide-1',
    nodeIds: ['node-1', 'node-2'],
    groupElement: { dataset: { editorId: 'group-1' } },
    importElementToCanonicalNode(element, options) {
      assert.equal(options.getNodeId(element), 'group-1');
      return { id: 'group-1', children: [{ id: 'node-1' }, { id: 'node-2' }] };
    },
    getNodeId: (element) => element.dataset.editorId
  });

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['group-1', 'after']);
  assert.deepEqual(result.slides[0].nodes[0].children.map((node) => node.id), ['node-1', 'node-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2', 'after']);
});

test('buildStudioCanonicalGroupDeck fails closed when grouping dependencies are incomplete', () => {
  assert.equal(canonicalGroup.buildStudioCanonicalGroupDeck({}), null);
  assert.equal(canonicalGroup.buildStudioCanonicalGroupDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: createSourceDeck(),
    slideId: 'slide-1',
    nodeIds: ['node-1'],
    groupElement: { dataset: { editorId: 'group-1' } },
    importElementToCanonicalNode() {
      return { id: 'group-1', children: [{ id: 'node-1' }] };
    }
  }), null);
});

test('buildStudioCanonicalUngroupDeck restores imported children without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'group-1', children: [{ id: 'child-1' }, { id: 'child-2' }] }]
    }]
  });
  const group = { dataset: { editorId: 'group-1' } };
  const result = canonicalGroup.buildStudioCanonicalUngroupDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    groupTargets: [{ group, groupId: 'group-1', parentNodeId: '', slideId: 'slide-1' }],
    restoredGroups: [{ group, restoredElements: [
      { dataset: { editorId: 'child-1' } },
      { dataset: { editorId: 'child-2' } }
    ] }],
    importElementToCanonicalNode(element, options) {
      return { id: options.getNodeId(element) };
    },
    getElementId: (element) => element.dataset.editorId
  });

  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['child-1', 'child-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['group-1']);
});
