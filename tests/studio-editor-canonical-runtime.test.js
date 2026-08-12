const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const canonicalRuntime = require('../shared/studio-editor-canonical-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('canonical runtime composes state, builders, and bridge with shared dependencies', () => {
  const calls = [];
  const state = { name: 'state' };
  const canonicalDeckBuilder = { name: 'deck-builder' };
  const mutationCanonicalDeckBuilder = { name: 'mutation-builder' };
  const canonicalBridge = { name: 'bridge' };
  const isCanonicalDeck = () => true;
  const callbacks = {
    getCurrentPresentationMetadata() {},
    getPersistedCanonicalDeck() {},
    resolveLiveCanonicalDeck() {},
    resolveStoredCanonicalBaseline() {},
    buildPresentationMetadataSeed() {},
    getPresentationUrl() {},
    getPresentationTitle() {},
    buildStudioCanonicalDeck() {},
    buildCanonicalDeckFromDocument() {},
    getSlideId() {},
    getNodeId() {},
    buildCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    getDocument() {}
  };
  const canonicalStateApi = {
    createStudioEditorCanonicalState(options) {
      calls.push(['state', options]);
      return state;
    }
  };
  const canonicalDeckApi = {
    createStudioCanonicalDeckBuilder(options) {
      calls.push(['deck', options]);
      return canonicalDeckBuilder;
    }
  };
  const canonicalMutationApi = {
    createStudioEditorMutationCanonicalDeckBuilder(options) {
      calls.push(['mutation', options]);
      return mutationCanonicalDeckBuilder;
    }
  };
  const canonicalBridgeApi = {
    createStudioEditorCanonicalBridge(options) {
      calls.push(['bridge', options]);
      return canonicalBridge;
    }
  };

  const result = canonicalRuntime.createStudioEditorCanonicalRuntime({
    canonicalStateApi,
    canonicalDeckApi,
    canonicalMutationApi,
    canonicalBridgeApi,
    isCanonicalDeck,
    ...callbacks
  });

  assert.deepEqual(result, {
    canonicalState: state,
    canonicalDeckBuilder,
    mutationCanonicalDeckBuilder,
    canonicalBridge
  });
  assert.equal(calls[0][1].isCanonicalDeck, isCanonicalDeck);
  assert.equal(calls[1][1].getCurrentPresentationMetadata, callbacks.getCurrentPresentationMetadata);
  assert.equal(calls[1][1].getNodeId, callbacks.getNodeId);
  assert.equal(calls[2][1].buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(calls[2][1].getCanonicalDeckBaseline, callbacks.getCanonicalDeckBaseline);
  assert.equal(calls[3][1].state, state);
  assert.equal(calls[3][1].canonicalDeckBuilder, canonicalDeckBuilder);
  assert.equal(calls[3][1].mutationCanonicalDeckBuilder, mutationCanonicalDeckBuilder);
  assert.equal(calls[3][1].getDocument, callbacks.getDocument);
});

test('index wires canonical editor composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorCanonicalRuntimeOptionsApi\.createStudioEditorCanonicalRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorCanonicalRuntime\.createStudioEditorCanonicalRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorCanonicalState\.createStudioEditorCanonicalState\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorCanonicalDeck\.createStudioCanonicalDeckBuilder\(/
  );
});
