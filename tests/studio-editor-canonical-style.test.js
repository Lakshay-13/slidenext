const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalStyle = require('../shared/studio-editor-canonical-style.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        text: 'Before',
        html: '<p>Before</p>',
        attributes: { src: 'before.png' },
        style: 'color: #000000;',
        layout: { zIndex: 1 }
      }]
    }]
  });
}

function createElement() {
  return {
    dataset: { editorId: 'node-1' },
    textContent: 'After',
    src: 'after.png',
    style: {
      color: '#ffffff',
      objectFit: 'cover',
      objectPosition: 'right bottom',
      zIndex: '9'
    },
    getAttribute(name) {
      return name === 'src' ? this.src : null;
    }
  };
}

test('buildStudioCanonicalStyleBaseline prefers the live canonical baseline builder', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      throw new Error('DOM-derived mutation builder should not build the baseline');
    },
    buildCanonicalDeckBaseline(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalStyleBaseline delegates baseline resolution to the shared canonical-state reader', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let readerOptions = null;
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
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
    buildCanonicalDeckBaseline() {
      return null;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
  assert.equal(typeof readerOptions.buildCanonicalDeckBaseline, 'function');
});

test('buildStudioCanonicalStyleBaseline prefers a valid session-owned canonical deck', () => {
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
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

test('buildStudioCanonicalStyleBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeck: () => {
      rebuildCalls += 1;
      return { invalid: true };
    }
  });

  assert.equal(result, null);
  assert.equal(rebuildCalls, 1);
});

test('buildStudioCanonicalStyleBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalNodeStyle() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalStyle.buildStudioCanonicalStyleBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalStyle.buildStudioCanonicalStyleBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalStyleBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('legacy baseline failed');
    },
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalStyleBaseline disables live reuse for compatibility rebuilds', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let rebuildOptions = null;
  const result = canonicalStyle.buildStudioCanonicalStyleBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(documentRef, options) {
      assert.equal(documentRef, sourceDocument);
      rebuildOptions = options;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.deepEqual(rebuildOptions, { preferLiveCanonicalDeck: false });
});

test('buildStudioCanonicalStyleMutation maps text, source, style, and z-index edits to the model', () => {
  const sourceDeck = createSourceDeck();
  const element = createElement();
  const options = {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    selection: [element],
    getElementId: (node) => node.dataset.editorId
  };

  const textDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'text', value: 'Fallback' });
  assert.equal(textDeck.slides[0].nodes[0].text, 'Fallback');
  assert.equal(textDeck.slides[0].nodes[0].html, '');
  assert.equal(sourceDeck.slides[0].nodes[0].text, 'Before');

  const sourceDeckUpdate = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'src', value: 'fallback.png' });
  assert.equal(sourceDeckUpdate.slides[0].nodes[0].attributes.src, 'after.png');

  const styleDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'color', value: '#ffffff' });
  assert.equal(styleDeck.slides[0].nodes[0].style, 'color: #ffffff;');

  const imageFitDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'objectFit', value: 'cover' });
  assert.equal(imageFitDeck.slides[0].nodes[0].style, 'color: #000000; object-fit: cover;');

  const imagePositionDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'objectPosition', value: 'right bottom' });
  assert.equal(imagePositionDeck.slides[0].nodes[0].style, 'color: #000000; object-position: right bottom;');

  const zIndexDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'zIndex', value: '9' });
  assert.equal(zIndexDeck.slides[0].nodes[0].layout.zIndex, 9);
});

test('buildStudioCanonicalStyleMutation uses the requested text without rebuilding the live document', () => {
  const sourceDeck = createSourceDeck();
  let buildCalls = 0;

  const result = canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    buildCanonicalDeck() {
      buildCalls += 1;
      return null;
    },
    selection: [createElement()],
    prop: 'text',
    value: 'Requested text',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(buildCalls, 0);
  assert.equal(result.slides[0].nodes[0].text, 'Requested text');
  assert.equal(result.slides[0].nodes[0].html, '');
});

test('buildStudioCanonicalStyleMutation uses the requested chart data without rebuilding the live document', () => {
  const sourceDeck = createSourceDeck();
  let buildCalls = 0;
  const chart = {
    dataset: { editorId: 'node-1', chartValues: 'stale-value' }
  };

  const result = canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    buildCanonicalDeck() {
      buildCalls += 1;
      return null;
    },
    selection: [chart],
    prop: 'chartValues',
    value: '42,68,55,86',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(buildCalls, 0);
  assert.equal(result.slides[0].nodes[0].attributes['data-chart-values'], '42,68,55,86');
});

test('buildStudioCanonicalStyleMutation uses the requested chart title without rebuilding the live document', () => {
  const sourceDeck = createSourceDeck();
  let buildCalls = 0;
  const chart = {
    dataset: { editorId: 'node-1' },
    querySelector() {
      throw new Error('DOM title lookup should not be needed');
    }
  };

  const result = canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    buildCanonicalDeck() {
      buildCalls += 1;
      return null;
    },
    selection: [chart],
    prop: 'chartTitle',
    value: 'Updated trend',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(buildCalls, 0);
  assert.equal(result.slides[0].nodes[0].attributes['data-chart-title'], 'Updated trend');
});

test('buildStudioCanonicalStyleMutation fails closed when the canonical style mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalNodeStyle() {
      throw new Error('canonical style mutation failed');
    }
  };

  const result = canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: createSourceDeck(),
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalStyleMutation returns null without a canonical model or supported property', () => {
  const element = createElement();
  assert.equal(canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    selection: [element],
    prop: 'color'
  }), null);
  assert.equal(canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: createSourceDeck(),
    selection: [element],
    prop: 'unsupported'
  }), null);
});

test('buildStudioCanonicalStyleMutationWithBaseline builds the model from the source document', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalStyle.buildStudioCanonicalStyleMutationWithBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck: () => sourceDeck,
    sourceDocument: { id: 'editor-doc' },
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].style, 'color: #ffffff;');
  assert.equal(sourceDeck.slides[0].nodes[0].style, 'color: #000000;');
});

test('buildStudioCanonicalStyleMutationWithBaseline falls back when the live baseline is invalid', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalStyle.buildStudioCanonicalStyleMutationWithBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeckBaseline() {
      return sourceDeck;
    },
    sourceDocument: { id: 'editor-doc' },
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].style, 'color: #ffffff;');
});

test('buildStudioCanonicalStyleMutationWithBaseline can use only a valid live baseline', () => {
  const liveDeck = createSourceDeck();
  const result = canonicalStyle.buildStudioCanonicalStyleMutationWithBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => liveDeck,
    sourceDocument: { id: 'editor-doc' },
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result.slides[0].nodes[0].style, 'color: #ffffff;');
  assert.equal(liveDeck.slides[0].nodes[0].style, 'color: #000000;');
});

test('createStudioCanonicalStyleMutationBuilders reuses an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  let buildCount = 0;
  const builders = canonicalStyle.createStudioCanonicalStyleMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalStyleMutation({
    canonicalDeckBeforeMutation: sourceDeck,
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].nodes[0].style, 'color: #ffffff;');
  assert.equal(sourceDeck.slides[0].nodes[0].style, 'color: #000000;');
});

test('createStudioCanonicalStyleMutationBuilders uses the live baseline builder', () => {
  const sourceDeck = createSourceDeck();
  let baselineCalls = 0;
  const builders = canonicalStyle.createStudioCanonicalStyleMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      throw new Error('DOM-derived mutation builder should not build the baseline');
    },
    buildCanonicalDeckBaseline() {
      baselineCalls += 1;
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalStyleMutation({
    sourceDocument: { id: 'editor-doc' },
    selection: [createElement()],
    prop: 'color',
    value: '#ffffff',
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(baselineCalls, 1);
  assert.equal(result.slides[0].nodes[0].style, 'color: #ffffff;');
});
