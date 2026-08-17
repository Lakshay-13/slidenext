const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistedHtmlAction = require('../shared/studio-editor-persisted-html-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted html action prefers the persistence controller', () => {
  const calls = [];
  const resolveEditorReusablePersistedHtml = persistedHtmlAction.createStudioEditorPersistedHtmlAction({
    getPersistenceController: () => ({
      resolveReusablePersistedHtml(...args) {
        calls.push(args);
        return '<html>controller</html>';
      }
    })
  });

  assert.equal(
    resolveEditorReusablePersistedHtml({ cleanHtml: '<html>old</html>' }, { id: 1 }),
    '<html>controller</html>'
  );
  assert.deepEqual(calls, [[{ cleanHtml: '<html>old</html>' }, { id: 1 }]]);
});

test('persisted html action caches the shared state adapter', () => {
  let createCalls = 0;
  const persistenceApi = { id: 'persistence-api' };
  const resolveEditorReusablePersistedHtml = persistedHtmlAction.createStudioEditorPersistedHtmlAction({
    persistenceApi,
    persistenceStateApi: {
      createStudioEditorReusablePersistedHtmlAdapter(options) {
        createCalls += 1;
        assert.equal(options.persistenceApi, persistenceApi);
        return (state, options) => `${state.cleanHtml}:${options.id}`;
      }
    }
  });

  assert.equal(resolveEditorReusablePersistedHtml({ cleanHtml: '<html>saved</html>' }, { id: 1 }), '<html>saved</html>:1');
  assert.equal(resolveEditorReusablePersistedHtml({ cleanHtml: '<html>saved</html>' }, { id: 2 }), '<html>saved</html>:2');
  assert.equal(createCalls, 1);
});

test('persisted html action preserves shared resolver-builder options', () => {
  let capturedOptions = null;
  const persistenceApi = {
    createStudioReusablePersistedHtmlResolver(options) {
      capturedOptions = options;
      return (state, nextOptions) => ({ state, nextOptions });
    },
    resolveStudioReusablePersistedHtml() {},
    resolveStudioPersistedHtmlReuse() {},
    isStudioPersistedCanonicalDeck() {}
  };
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const resolveEditorReusablePersistedHtml = persistedHtmlAction.createStudioEditorPersistedHtmlAction({
    persistenceApi
  });
  const result = resolveEditorReusablePersistedHtml({ cleanHtml: '<html>saved</html>' }, {
    canonicalDeck,
    persistedHtml: '<html>saved</html>',
    persistedCanonicalDeck: canonicalDeck
  });

  assert.equal(result.nextOptions.canonicalDeck, canonicalDeck);
  assert.equal(result.nextOptions.persistedHtml, '<html>saved</html>');
  assert.equal(typeof capturedOptions.resolveReusablePersistedHtml, 'function');
  assert.equal(typeof capturedOptions.resolvePersistedHtmlReuse, 'function');
  assert.equal(typeof capturedOptions.isPersistedCanonicalDeck, 'function');
});

test('persisted html action fails closed without a shared persistence runtime', () => {
  const resolveEditorReusablePersistedHtml = persistedHtmlAction.createStudioEditorPersistedHtmlAction({});

  assert.equal(resolveEditorReusablePersistedHtml({ cleanHtml: '<html>saved</html>' }), '');
});

test('index loads and installs the shared persisted html action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-persisted-html-action\.js"><\/script>/);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-html-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-html-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-html-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorPersistedHtmlShellComposition\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistedHtmlRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistedHtmlRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistedHtmlShellRuntimeApi\s*\.\s*createStudioEditorPersistedHtmlShellRuntime\(/
  );
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorPersistedHtmlGlobalApi\);/);
  assert.doesNotMatch(fileContent, /function resolveEditorReusablePersistedHtml\(persistedDeckState, options = \{\}\) \{/);
});
