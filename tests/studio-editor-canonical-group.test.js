const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
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
    canonicalStateApi: canonicalState,
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

test('buildStudioCanonicalGroupDeck fails closed when the canonical group mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    groupCanonicalNodes() {
      throw new Error('canonical group mutation failed');
    }
  };

  const result = canonicalGroup.buildStudioCanonicalGroupDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: createSourceDeck(),
    slideId: 'slide-1',
    nodeIds: ['node-1', 'node-2'],
    groupElement: { dataset: { editorId: 'group-1' } },
    importElementToCanonicalNode() {
      return { id: 'group-1' };
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalGroupDeck fails closed when grouping dependencies are incomplete', () => {
  assert.equal(canonicalGroup.buildStudioCanonicalGroupDeck({}), null);
  assert.equal(canonicalGroup.buildStudioCanonicalGroupDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    canonicalDeckBeforeMutation: createSourceDeck(),
    slideId: 'slide-1',
    nodeIds: ['node-1'],
    groupElement: { dataset: { editorId: 'group-1' } },
    importElementToCanonicalNode() {
      return { id: 'group-1', children: [{ id: 'node-1' }] };
    }
  }), null);
});

test('buildStudioCanonicalGroupBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalGroup.buildStudioCanonicalGroupBaseline({
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

test('group and ungroup baselines delegate to the shared canonical-state reader', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let readerCalls = 0;
  const canonicalStateApi = {
    createStudioEditorCanonicalDeckBaselineReader(options) {
      readerCalls += 1;
      assert.equal(typeof options.getCanonicalDeckBaseline, 'function');
      assert.equal(options.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
      assert.equal(typeof options.buildCanonicalDeckBaseline, 'function');
      return (documentRef) => {
        assert.equal(documentRef, sourceDocument);
        return sourceDeck;
      };
    }
  };

  const groupBaseline = canonicalGroup.buildStudioCanonicalGroupBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi,
    getCanonicalDeckBaseline() {
      return null;
    },
    buildCanonicalDeckBaseline() {
      return null;
    },
    sourceDocument
  });
  const ungroupBaseline = canonicalGroup.buildStudioCanonicalUngroupBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi,
    getCanonicalDeckBaseline() {
      return null;
    },
    buildCanonicalDeckBaseline() {
      return null;
    },
    sourceDocument
  });

  assert.equal(groupBaseline, sourceDeck);
  assert.equal(ungroupBaseline, sourceDeck);
  assert.equal(readerCalls, 2);
});

test('buildStudioCanonicalGroupBaseline prefers a valid live canonical deck', () => {
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalGroup.buildStudioCanonicalGroupBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return createSourceDeck();
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalGroupBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalGroup.buildStudioCanonicalGroupBaseline({
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

test('buildStudioCanonicalGroupBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    groupCanonicalNodes() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalGroup.buildStudioCanonicalGroupBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalGroup.buildStudioCanonicalGroupBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('group and ungroup baselines fail closed when a compatibility rebuild throws', () => {
  const options = {
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('legacy baseline failed');
    },
    sourceDocument: { id: 'editor-doc' }
  };

  assert.equal(canonicalGroup.buildStudioCanonicalGroupBaseline(options), null);
  assert.equal(canonicalGroup.buildStudioCanonicalUngroupBaseline(options), null);
});

test('createStudioCanonicalGroupMutationBuilders preserves an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  const explicitBaseline = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }, { id: 'node-2' }] }]
  });
  let buildCount = 0;
  const builders = canonicalGroup.createStudioCanonicalGroupMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    },
    importElementToCanonicalNode(element, options) {
      return {
        id: options.getNodeId(element),
        children: [{ id: 'node-1' }, { id: 'node-2' }]
      };
    }
  });

  const result = builders.buildCanonicalGroupDeck({
    canonicalDeckBeforeMutation: explicitBaseline,
    slideId: 'slide-1',
    nodeIds: ['node-1', 'node-2'],
    groupElement: { dataset: { editorId: 'group-1' } },
    getNodeId: (element) => element.dataset.editorId,
    parentNodeId: ''
  });

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].nodes[0].id, 'group-1');
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
    canonicalStateApi: canonicalState,
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

test('buildStudioCanonicalUngroupDeck fails closed when the canonical ungroup mutation throws', () => {
  const group = { dataset: { editorId: 'group-1' } };
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    ungroupCanonicalNodes() {
      throw new Error('canonical ungroup mutation failed');
    }
  };

  const result = canonicalGroup.buildStudioCanonicalUngroupDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1', nodes: [{ id: 'group-1' }] }]
    }),
    groupTargets: [{ group, groupId: 'group-1', parentNodeId: '', slideId: 'slide-1' }],
    restoredGroups: [{
      group,
      restoredElements: [{ dataset: { editorId: 'child-1' } }]
    }],
    importElementToCanonicalNode() {
      return { id: 'child-1' };
    },
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalUngroupBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalGroup.buildStudioCanonicalUngroupBaseline({
    canonicalDeckApi: canonicalDeck,
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

test('buildStudioCanonicalUngroupBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalGroup.buildStudioCanonicalUngroupBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeckBaseline() {
      didBuildFromDocument = true;
      return sourceDeck;
    }
  });

  assert.equal(result, sourceDeck);
  assert.equal(didBuildFromDocument, true);
});

test('createStudioCanonicalUngroupMutationBuilders preserves an explicit baseline', () => {
  const explicitBaseline = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'group-1', children: [{ id: 'child-1' }, { id: 'child-2' }] }]
    }]
  });
  let buildCount = 0;
  const group = { dataset: { editorId: 'group-1' } };
  const builders = canonicalGroup.createStudioCanonicalUngroupMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      buildCount += 1;
      return createSourceDeck();
    },
    importElementToCanonicalNode(element, options) {
      return { id: options.getNodeId(element) };
    }
  });

  const result = builders.buildCanonicalUngroupDeck({
    canonicalDeckBeforeMutation: explicitBaseline,
    groupTargets: [{ group, groupId: 'group-1', parentNodeId: '', slideId: 'slide-1' }],
    restoredGroups: [{
      group,
      restoredElements: [
        { dataset: { editorId: 'child-1' } },
        { dataset: { editorId: 'child-2' } }
      ]
    }],
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(buildCount, 0);
  assert.deepEqual(result.slides[0].nodes.map((node) => node.id), ['child-1', 'child-2']);
});
