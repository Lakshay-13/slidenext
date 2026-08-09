const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckBuilder = require('../shared/studio-editor-canonical-deck.js');
const canonicalBridge = require('../shared/studio-editor-canonical-bridge.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

test('shared editor canonical-deck shape predicate accepts decks and rejects malformed values', () => {
  assert.equal(canonicalState.isStudioEditorCanonicalDeckLike({ slides: [] }), true);
  assert.equal(canonicalState.isStudioEditorCanonicalDeckLike({ slides: 'invalid' }), false);
  assert.equal(canonicalState.isStudioEditorCanonicalDeckLike([]), false);
  assert.equal(canonicalState.isStudioEditorCanonicalDeckLike(null), false);
});

test('canonical deck baseline reader prefers live state and falls back to rebuilds', () => {
  const doc = { id: 'iframe-doc' };
  const liveDeck = { slides: [{ id: 'live' }] };
  const rebuiltDeck = { slides: [{ id: 'rebuilt' }] };
  const calls = [];
  const readBaseline = canonicalState.createStudioEditorCanonicalDeckBaselineReader({
    getCanonicalDeckBaseline(sourceDocument) {
      calls.push(['live', sourceDocument]);
      return liveDeck;
    },
    buildCanonicalDeckBaseline(sourceDocument) {
      calls.push(['rebuild', sourceDocument]);
      return rebuiltDeck;
    }
  });

  assert.equal(readBaseline(doc), liveDeck);
  assert.deepEqual(calls, [['live', doc]]);

  const fallbackReader = canonicalState.createStudioEditorCanonicalDeckBaselineReader({
    getCanonicalDeckBaseline() {
      throw new Error('live state unavailable');
    },
    buildCanonicalDeckBaseline(sourceDocument) {
      assert.equal(sourceDocument, doc);
      return rebuiltDeck;
    }
  });
  assert.equal(fallbackReader(doc), rebuiltDeck);
});

test('canonical deck baseline reader validates live models before falling back', () => {
  const rebuiltDeck = { slides: [{ id: 'rebuilt' }] };
  let didRebuild = false;
  const readBaseline = canonicalState.createStudioEditorCanonicalDeckBaselineReader({
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    isCanonicalDeck(value) {
      return !!value && Array.isArray(value.slides);
    },
    buildCanonicalDeckBaseline() {
      didRebuild = true;
      return rebuiltDeck;
    }
  });

  assert.equal(readBaseline({ id: 'iframe-doc' }), rebuiltDeck);
  assert.equal(didRebuild, true);
});

test('canonical deck baseline reader rejects invalid rebuilt models', () => {
  const readBaseline = canonicalState.createStudioEditorCanonicalDeckBaselineReader({
    buildCanonicalDeckBaseline() {
      return { invalid: true };
    },
    isCanonicalDeck(value) {
      return !!value && Array.isArray(value.slides);
    }
  });

  assert.equal(readBaseline({ id: 'iframe-doc' }), null);
});

test('canonical deck baseline reader rejects malformed results without a custom validator', () => {
  const calls = [];
  const readBaseline = canonicalState.createStudioEditorCanonicalDeckBaselineReader({
    getCanonicalDeckBaseline() {
      calls.push('live');
      return { invalid: true };
    },
    buildCanonicalDeckBaseline() {
      calls.push('rebuild');
      return { invalid: true };
    }
  });

  assert.equal(readBaseline({ id: 'iframe-doc' }), null);
  assert.deepEqual(calls, ['live', 'rebuild']);
});

test('canonical deck resolver prefers a valid live deck and safely falls back', () => {
  const documentRef = { id: 'iframe-doc' };
  const liveDeck = { slides: [{ id: 'live' }] };
  const fallbackDeck = { slides: [{ id: 'fallback' }] };
  let fallbackCalls = 0;
  const resolveCanonicalDeck = canonicalState.createStudioEditorCanonicalDeckResolver({
    getCanonicalDeckBaseline(sourceDocument) {
      assert.equal(sourceDocument, documentRef);
      return liveDeck;
    },
    getCanonicalDeck() {
      fallbackCalls += 1;
      return fallbackDeck;
    }
  });

  assert.equal(resolveCanonicalDeck(documentRef), liveDeck);
  assert.equal(fallbackCalls, 0);

  const fallbackResolver = canonicalState.createStudioEditorCanonicalDeckResolver({
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    getCanonicalDeck(sourceDocument) {
      assert.equal(sourceDocument, documentRef);
      return fallbackDeck;
    }
  });
  assert.equal(fallbackResolver(documentRef), fallbackDeck);

  const throwingResolver = canonicalState.createStudioEditorCanonicalDeckResolver({
    getCanonicalDeck() {
      throw new Error('fallback unavailable');
    }
  });
  assert.equal(throwingResolver(documentRef), null);
});

const selectionBounds = require('../shared/studio-editor-selection-bounds.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createDeck(id) {
  return {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    metadata: { id },
    slides: []
  };
}

test('studio editor canonical state resolves only for its owning document and session', () => {
  const state = canonicalState.createStudioEditorCanonicalState({
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });
  const documentRef = {};
  const deck = createDeck('active');

  assert.equal(state.set(deck, { documentRef, sessionToken: 4 }), deck);
  assert.equal(state.resolve({ documentRef, sessionToken: 4 }), deck);
  assert.equal(state.resolve(), null);
  assert.equal(state.resolve(null), null);
  assert.equal(state.resolve({ documentRef }), null);
  assert.equal(state.resolve({ sessionToken: 4 }), null);
  assert.equal(state.resolve({ documentRef: {}, sessionToken: 4 }), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 5 }), null);
});

test('studio editor canonical state rejects invalid models and can be reset', () => {
  const state = canonicalState.createStudioEditorCanonicalState();
  const deck = createDeck('active');
  const documentRef = {};

  assert.doesNotThrow(() => state.set(deck, null));
  assert.equal(state.resolve(), deck);
  state.set(deck, { documentRef, sessionToken: 1 });
  assert.equal(state.set(null, { documentRef, sessionToken: 1 }), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 1 }), null);

  state.set(deck, { documentRef, sessionToken: 1 });
  assert.equal(state.reset(), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 1 }), null);
});

test('studio editor canonical state fails closed when validation throws', () => {
  const state = canonicalState.createStudioEditorCanonicalState({
    isCanonicalDeck() {
      throw new Error('validator unavailable');
    }
  });

  assert.doesNotThrow(() => state.set({ slides: [] }));
  assert.equal(state.resolve(), null);
});

test('canonical node reader resolves safely and fails closed on lookup errors', () => {
  const canonicalDeck = createDeck('active');
  const element = { id: 'node-1' };
  const reader = canonicalState.createStudioEditorCanonicalNodeReader(canonicalDeck, {
    resolveCanonicalNode(target, deck) {
      assert.equal(deck, canonicalDeck);
      return target === element ? { id: 'node-1' } : null;
    }
  });

  assert.deepEqual(reader(element), { id: 'node-1' });
  assert.equal(reader({ id: 'missing' }), null);

  const throwingReader = canonicalState.createStudioEditorCanonicalNodeReader(canonicalDeck, {
    resolveCanonicalNode() {
      throw new Error('lookup failed');
    }
  });
  assert.equal(throwingReader(element), null);
});

test('canonical node reader adapter resolves through the supplied deck API and fails closed', () => {
  const canonicalDeck = createDeck('active');
  const element = { dataset: { editorId: 'node-1' } };
  const canonicalDeckApi = {
    findCanonicalNodeById(deck, elementId) {
      assert.equal(deck, canonicalDeck);
      return elementId === 'node-1' ? { id: 'node-1' } : null;
    }
  };
  const reader = canonicalState.createStudioEditorCanonicalNodeReaderFromApi(canonicalDeck, {
    canonicalDeckApi
  });

  assert.deepEqual(reader(element), { id: 'node-1' });
  assert.equal(reader({ dataset: { editorId: 'missing' } }), null);

  const throwingReader = canonicalState.createStudioEditorCanonicalNodeReaderFromApi(canonicalDeck, {
    canonicalDeckApi: {
      findCanonicalNodeById() {
        throw new Error('lookup failed');
      }
    }
  });
  assert.equal(throwingReader(element), null);
});

test('editor canonical node resolver prefers the shared safe reader', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalNodeForElement(element, canonicalDeck = null) {',
    '\n\n    function getLiveSelectedElements(elements = selectedElements, doc = getIframeDoc()) {'
  );
  const calls = [];
  const canonicalDeck = createDeck('active');
  const target = { dataset: { editorId: 'node-1' } };
  const expectedNode = { id: 'node-1' };
  const context = {
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextCanonicalDeck: {
      findCanonicalNodeById(deck, elementId) {
        calls.push([deck, elementId]);
        return elementId === 'node-1' ? expectedNode : null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(resolverSource, context);

  assert.equal(context.resolveEditorCanonicalNodeForElement(target, canonicalDeck), expectedNode);
  assert.deepEqual(calls, [[canonicalDeck, 'node-1']]);
});

test('canonical visibility reader prefers model state and falls back safely', () => {
  const element = { id: 'node-1' };
  const canonicalDeck = createDeck('active');
  const reader = canonicalState.createStudioEditorCanonicalVisibilityReader(canonicalDeck, {
    property: 'locked',
    resolveCanonicalNode(target, deck) {
      assert.equal(deck, canonicalDeck);
      return target === element ? { visibility: { locked: true } } : null;
    },
    fallbackReader() {
      return false;
    }
  });

  assert.equal(reader(element), true);
  assert.equal(reader({ id: 'missing' }), false);

  const throwingReader = canonicalState.createStudioEditorCanonicalVisibilityReader(canonicalDeck, {
    property: 'hidden',
    resolveCanonicalNode() {
      throw new Error('lookup failed');
    },
    fallbackReader() {
      return true;
    }
  });
  assert.equal(throwingReader(element), true);
});

test('canonical lock reader preserves DOM locks while preferring canonical locks', () => {
  const canonicalDeck = createDeck('active');
  const elements = {
    canonicalLocked: { id: 'canonical-locked', domLocked: false },
    canonicalUnlocked: { id: 'canonical-unlocked', domLocked: true },
    missing: { id: 'missing', domLocked: true }
  };
  const reader = canonicalState.createStudioEditorCanonicalLockReader(canonicalDeck, {
    resolveCanonicalNode(element) {
      if (element === elements.canonicalLocked) return { visibility: { locked: true } };
      if (element === elements.canonicalUnlocked) return { visibility: { locked: false } };
      return null;
    },
    fallbackReader: (element) => element.domLocked
  });

  assert.equal(reader(elements.canonicalLocked), true);
  assert.equal(reader(elements.canonicalUnlocked), true);
  assert.equal(reader(elements.missing), true);
});

test('canonical lock reader adapter resolves nodes through the supplied deck API', () => {
  const canonicalDeck = createDeck('active');
  const element = { dataset: { editorId: 'node-1' }, domLocked: false };
  const canonicalDeckApi = {
    findCanonicalNodeById(deck, elementId) {
      assert.equal(deck, canonicalDeck);
      return elementId === 'node-1' ? { visibility: { locked: true } } : null;
    }
  };
  const reader = canonicalState.createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, {
    canonicalDeckApi,
    fallbackReader: (target) => target.domLocked
  });

  assert.equal(reader(element), true);
  assert.equal(reader({ dataset: { editorId: 'missing' }, domLocked: true }), true);
});

test('canonical visibility reader adapter resolves properties through the supplied deck API', () => {
  const canonicalDeck = createDeck('active');
  const element = { dataset: { editorId: 'node-1' }, domHidden: false };
  const canonicalDeckApi = {
    findCanonicalNodeById(deck, elementId) {
      assert.equal(deck, canonicalDeck);
      return elementId === 'node-1' ? { visibility: { hidden: true } } : null;
    }
  };
  const reader = canonicalState.createStudioEditorCanonicalVisibilityReaderFromApi(canonicalDeck, {
    property: 'hidden',
    canonicalDeckApi,
    fallbackReader: (target) => target.domHidden
  });

  assert.equal(reader(element), true);
  assert.equal(reader({ dataset: { editorId: 'missing' }, domHidden: true }), true);
});

test('canonical visibility reader assembly selects shared lock and property adapters', () => {
  const canonicalDeck = createDeck('active');
  const elements = {
    locked: { dataset: { editorId: 'locked' }, domLocked: false },
    hidden: { dataset: { editorId: 'hidden' }, domHidden: false }
  };
  const canonicalDeckApi = {
    findCanonicalNodeById(_deck, elementId) {
      if (elementId === 'locked') return { visibility: { locked: true } };
      if (elementId === 'hidden') return { visibility: { hidden: true } };
      return null;
    }
  };

  const readLocked = canonicalState.createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
    property: 'locked',
    canonicalDeckApi,
    fallbackReader: (element) => element.domLocked
  });
  const readHidden = canonicalState.createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
    property: 'hidden',
    canonicalDeckApi,
    fallbackReader: (element) => element.domHidden
  });

  assert.equal(readLocked(elements.locked), true);
  assert.equal(readHidden(elements.hidden), true);
  assert.equal(
    canonicalState.createStudioEditorCanonicalVisibilityReaderForDeck(null, {
      fallbackReader: () => true
    })({}),
    true
  );
});

test('editor selection bounds and overlays use canonical hidden state before DOM fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const selectionBoundsSource = extractFunctionSource(
    fileContent,
    'function getSelectionBounds(elements = selectedElements, slideMetrics = null) {',
    '\n\n    function syncSelectionOverlay'
  );
  const overlaySource = extractFunctionSource(
    fileContent,
    '    function syncSelectionOverlay() {',
    '\n\n    function syncInspectorForSelection'
  );
  const documentRef = { id: 'active-frame' };
  const slide = { id: 'slide-1' };
  const hiddenElement = {
    dataset: { editorId: 'hidden-node' },
    domHidden: false,
    getBoundingClientRect() {
      return { left: 100, top: 100, right: 300, bottom: 300 };
    }
  };
  const visibleElement = {
    dataset: { editorId: 'visible-node' },
    domHidden: false,
    getBoundingClientRect() {
      return { left: 10, top: 20, right: 110, bottom: 80 };
    }
  };
  const canonicalDeck = createDeck('live');
  canonicalDeck.slides = [{
    id: 'slide-1',
    nodes: [
      { id: 'hidden-node', visibility: { hidden: true } },
      { id: 'visible-node', visibility: { hidden: false, locked: false } }
    ]
  }];
  const context = {
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorSelectionBounds: selectionBounds,
    SlideNextStudioEditorOverlay: {
      syncStudioSelectionOverlayForActiveSlide(options) {
        return options.isHidden(hiddenElement);
      }
    },
    SlideNextStudioEditorOverlayState: {
      buildStudioSelectionOverlayState() {}
    },
    buildEditorCanonicalDeck() {
      return canonicalDeck;
    },
    getIframeDoc() {
      return documentRef;
    },
    getActiveSlide() {
      return slide;
    },
    getSlideMetrics() {
      return {};
    },
    getRectOnSlide(rect) {
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      };
    },
    resolveEditorCanonicalNodeForElement(element, deck) {
      return deck.slides[0].nodes.find((node) => node.id === element.dataset.editorId) || null;
    },
    isElementHidden(element) {
      return element.domHidden;
    },
    isElementLocked(element) {
      return !!element.domLocked;
    },
    MIN_ELEMENT_SIZE_PX: 24,
    getEditorOverlayOptions() {
      return {};
    },
    selectedElements: [hiddenElement, visibleElement],
    getTransformSelectionState() {
      return { canTransform: false };
    },
    hideGuides() {},
    hideDragHud() {}
  };

  vm.createContext(context);
  vm.runInContext(`${visibilityReaderSource}\n${selectionBoundsSource}\n${overlaySource}`, context);

  assert.deepEqual(context.getSelectionBounds([hiddenElement, visibleElement]), {
    left: 10,
    top: 20,
    right: 110,
    bottom: 80,
    width: 100,
    height: 60
  });
  assert.equal(context.syncSelectionOverlay(), true);
  visibleElement.domLocked = true;
  const readLockedState = context.getEditorCanonicalVisibilityReader(
    'locked',
    documentRef,
    context.isElementLocked
  );
  assert.equal(readLockedState(visibleElement), true);
});

test('buildEditorCanonicalDeck prefers the active live model unless DOM rebuild is requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorCanonicalDeckOverride'
  );
  const documentRef = { id: 'active-frame' };
  const liveDeck = createDeck('live');
  const rebuiltDeck = createDeck('rebuilt');
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(doc, options) {
        calls.push([doc, options]);
        return rebuiltDeck;
      }
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/demo/index.html',
    currentTitle: 'Demo',
    getEditorSlideId() {},
    assignEditorElementId() {},
    lastPersistedCanonicalDeck: null,
    resolveEditorLiveCanonicalDeck(doc, sessionToken) {
      assert.equal(doc, documentRef);
      assert.equal(sessionToken, 9);
      return liveDeck;
    },
    studioEditorSessionToken: 9,
    buildCurrentPresentationMetadataSeed() {},
    SlideNextCanonicalDeck: {
      isCanonicalDeck(value) {
        return !!value && value.kind === 'slidenext.deck';
      }
    }
  };
  context.studioEditorCanonicalDeckBuilder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    isCanonicalDeck: context.SlideNextCanonicalDeck.isCanonicalDeck,
    getCurrentPresentationMetadata: () => context.currentPresentationMetadata,
    getPersistedCanonicalDeck: () => context.lastPersistedCanonicalDeck,
    resolveLiveCanonicalDeck: (doc) => context.resolveEditorLiveCanonicalDeck(doc, context.studioEditorSessionToken),
    buildPresentationMetadataSeed: context.buildCurrentPresentationMetadataSeed,
    getPresentationUrl: () => context.currentPresentationUrl,
    getPresentationTitle: () => context.currentTitle,
    buildStudioCanonicalDeck: (doc, options) => context.SlideNextStudioDeckContext.buildStudioCanonicalDeck(doc, options),
    getSlideId: context.getEditorSlideId,
    getNodeId: context.assignEditorElementId
  });
  context.studioEditorCanonicalBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder: context.studioEditorCanonicalDeckBuilder,
    getCanonicalDeckBaseline: (doc) => context.resolveEditorLiveCanonicalDeck(doc, context.studioEditorSessionToken),
    getDocument: context.getIframeDoc
  });

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  assert.equal(context.buildEditorCanonicalDeck(documentRef), liveDeck);
  assert.equal(calls.length, 0);

  assert.equal(
    context.buildEditorCanonicalDeck(documentRef, { preferLiveCanonicalDeck: false }),
    rebuiltDeck
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].canonicalDeckBaseline, liveDeck);
});

test('buildEditorCanonicalDeck fails closed when the canonical builder throws', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorCanonicalDeckOverride'
  );
  const context = {
    studioEditorCanonicalDeckBuilder() {
      throw new Error('unsupported legacy markup');
    }
  };
  context.studioEditorCanonicalBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder: context.studioEditorCanonicalDeckBuilder
  });

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  assert.equal(context.buildEditorCanonicalDeck({ id: 'legacy-frame' }), null);
});
