const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapterApi = require('../shared/studio-editor-canonical-persistence-adapter.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function createDeck(id) {
  return {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    metadata: { id },
    slides: []
  };
}

test('canonical persistence adapter prefers the controller and preserves null fallthrough', () => {
  const controllerDeck = createDeck('controller');
  const stateDeck = createDeck('state');
  const calls = [];
  const adapter = adapterApi.createStudioEditorCanonicalPersistenceAdapter({
    getPersistenceController: () => ({
      resolveCanonicalDeckOverride(canonicalDeck, options) {
        calls.push(['controller', canonicalDeck, options]);
        return canonicalDeck ? controllerDeck : null;
      }
    }),
    persistenceStateApi: {
      createStudioEditorCanonicalDeckOverrideAdapter() {
        return (canonicalDeck) => {
          calls.push(['state', canonicalDeck]);
          return stateDeck;
        };
      }
    },
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });

  assert.equal(adapter.resolveCanonicalDeckOverride(null, { source: 'test' }), stateDeck);
  assert.equal(adapter.resolveCanonicalDeckOverride(createDeck('input'), { source: 'test' }), controllerDeck);
  assert.deepEqual(calls, [
    ['controller', null, { source: 'test' }],
    ['state', null],
    ['controller', createDeck('input'), { source: 'test' }]
  ]);
});

test('canonical persistence adapter prefers pending state before rebuilding an implicit override', () => {
  const pendingDeck = createDeck('pending');
  let controllerCalls = 0;
  let rebuildCalls = 0;
  const adapter = adapterApi.createStudioEditorCanonicalPersistenceAdapter({
    getPendingCanonicalDeck(sourceDocument) {
      assert.equal(sourceDocument, null);
      return pendingDeck;
    },
    getPersistenceController: () => ({
      resolveCanonicalDeckOverride() {
        controllerCalls += 1;
        return null;
      }
    }),
    buildCanonicalDeckForDocument() {
      rebuildCalls += 1;
      return createDeck('rebuilt');
    },
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });

  assert.equal(
    adapter.resolveCanonicalDeckOverride(null, { buildCanonicalDeck: () => createDeck('fallback') }),
    pendingDeck
  );
  assert.equal(controllerCalls, 0);
  assert.equal(rebuildCalls, 0);
});

test('canonical persistence adapter forwards document rebuilds through the fallback chain', () => {
  const documentRef = {};
  const inputDeck = createDeck('input');
  const rebuiltDeck = createDeck('rebuilt');
  let capturedOptions = null;
  const adapter = adapterApi.createStudioEditorCanonicalPersistenceAdapter({
    getPersistenceController: () => null,
    persistenceStateApi: {
      createStudioEditorFallbackCanonicalDeckAdapter(options) {
        capturedOptions = options;
        return (canonicalDeck, nextOptions) => {
          capturedOptions.nextOptions = nextOptions;
          return canonicalDeck ? nextOptions.buildCanonicalDeck() : null;
        };
      }
    },
    buildCanonicalDeckForDocument: (doc) => {
      assert.equal(doc, documentRef);
      return rebuiltDeck;
    },
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });

  assert.equal(adapter.resolveFallbackCanonicalDeck(documentRef, inputDeck), rebuiltDeck);
  assert.equal(typeof capturedOptions.nextOptions.buildCanonicalDeck, 'function');
  assert.equal(capturedOptions.nextOptions.sourceDocument, documentRef);
});

test('canonical persistence adapter supports the legacy persistence API when state adapters are absent', () => {
  const inputDeck = createDeck('input');
  const overrideDeck = createDeck('override');
  const rebuiltDeck = createDeck('rebuilt');
  let overrideOptions = null;
  const adapter = adapterApi.createStudioEditorCanonicalPersistenceAdapter({
    persistenceApi: {
      resolveStudioCanonicalDeckOverride(options) {
        overrideOptions = options;
        return overrideDeck;
      },
      createStudioFallbackCanonicalDeckResolver(options) {
        return (canonicalDeck) => options.buildCanonicalDeck ? options.buildCanonicalDeck() : canonicalDeck;
      }
    },
    buildCanonicalDeckForDocument: () => rebuiltDeck,
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });

  const buildCanonicalDeck = () => rebuiltDeck;
  assert.equal(
    adapter.resolveCanonicalDeckOverride(inputDeck, { buildCanonicalDeck }),
    overrideDeck
  );
  assert.equal(overrideOptions.canonicalDeck, inputDeck);
  assert.equal(overrideOptions.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(adapter.resolveFallbackCanonicalDeck({}, inputDeck), rebuiltDeck);
});

test('index delegates canonical persistence fallback resolution to the shared adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-persistence-adapter\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorCanonicalPersistenceAdapter\s*\.\s*createStudioEditorCanonicalPersistenceAdapter\(/
  );
  assert.doesNotMatch(
    fileContent,
    /createStudioEditorCanonicalDeckOverrideAdapter\({\s*persistenceApi,\s*isCanonicalDeck\s*\}\)/
  );
});
