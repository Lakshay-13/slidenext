const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlShellRuntime = require('../shared/studio-editor-persistable-deck-html-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persistable deck html shell runtime forwards html-build dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => '<html></html>';
  const publicBuilder = () => '<html>public</html>';
  const actionApi = {
    createStudioEditorPersistableDeckHtmlAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistableDeckHtmlGlobalApi(options) {
      globalOptions = options;
      return { buildPersistableDeckHtml: options.buildPersistableDeckHtml };
    }
  };
  const options = {
    actionApi,
    getDocument: () => null,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    deckPersistenceApi: { name: 'deck-persistence' },
    getCurrentPersistedDeckState: () => null,
    getPersistedDeckStateWithContent: () => null,
    getResolveCanonicalDeckOverride: () => null,
    getBuildCanonicalDeck: () => null,
    getResolveReusablePersistedHtml: () => null,
    getSanitizeReusablePersistedHtml: () => null,
    getCreateDeckViewBuildOptions: () => null,
    getBuildDeckRenderOptions: () => null,
    getBuildSourceDeckHtml: () => null,
    getCapturePlaybackState: () => null,
    getBuildSanitizerOptions: () => null,
    getResolveMetadataPersistenceOptions: () => null,
    buildPersistableDeckHtml: publicBuilder
  };

  const runtime = htmlShellRuntime
    .createStudioEditorPersistableDeckHtmlShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistableDeckHtmlAction, action);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.deckPersistenceApi, options.deckPersistenceApi);
  assert.equal(receivedOptions.getCurrentPersistedDeckState, options.getCurrentPersistedDeckState);
  assert.equal(receivedOptions.getPersistedDeckStateWithContent, options.getPersistedDeckStateWithContent);
  assert.equal(receivedOptions.getResolveCanonicalDeckOverride, options.getResolveCanonicalDeckOverride);
  assert.equal(receivedOptions.getBuildCanonicalDeck, options.getBuildCanonicalDeck);
  assert.equal(receivedOptions.getResolveReusablePersistedHtml, options.getResolveReusablePersistedHtml);
  assert.equal(receivedOptions.getSanitizeReusablePersistedHtml, options.getSanitizeReusablePersistedHtml);
  assert.equal(receivedOptions.getCreateDeckViewBuildOptions, options.getCreateDeckViewBuildOptions);
  assert.equal(receivedOptions.getBuildDeckRenderOptions, options.getBuildDeckRenderOptions);
  assert.equal(receivedOptions.getBuildSourceDeckHtml, options.getBuildSourceDeckHtml);
  assert.equal(receivedOptions.getCapturePlaybackState, options.getCapturePlaybackState);
  assert.equal(receivedOptions.getBuildSanitizerOptions, options.getBuildSanitizerOptions);
  assert.equal(
    receivedOptions.getResolveMetadataPersistenceOptions,
    options.getResolveMetadataPersistenceOptions
  );
  assert.equal(globalOptions.buildPersistableDeckHtml, publicBuilder);
  assert.equal(runtime.persistableDeckHtmlGlobalApi.buildPersistableDeckHtml, publicBuilder);
});

test('persistable deck html shell runtime falls back to the action for the public builder', () => {
  const action = () => '<html></html>';
  const runtime = htmlShellRuntime
    .createStudioEditorPersistableDeckHtmlShellRuntime({
      actionApi: {
        createStudioEditorPersistableDeckHtmlAction: () => action,
        createStudioEditorPersistableDeckHtmlGlobalApi: (options) => options
      }
    });

  assert.equal(runtime.persistableDeckHtmlGlobalApi.buildPersistableDeckHtml, action);
});

test('persistable deck html shell runtime fails closed when the action API is unavailable', () => {
  const runtime = htmlShellRuntime
    .createStudioEditorPersistableDeckHtmlShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistableDeckHtmlAction, null);
  assert.deepEqual(runtime.persistableDeckHtmlGlobalApi, {});
});

test('index routes persistable deck html installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-html-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-html-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorPersistableDeckHtmlRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorPersistableDeckHtmlShellRuntime =\s*studioEditorPersistableDeckHtmlRuntimeAccessors/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistableDeckHtmlShellRuntimeApi\s*\.createStudioEditorPersistableDeckHtmlShellRuntime\(/
  );
  assert.match(fileContent, /studioEditorPersistableDeckHtmlShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorPersistableDeckHtmlRuntimeAccessors/);
  assert.match(
    fileContent,
    /studioEditorPersistableDeckHtmlGlobalApi\s*=\s*studioEditorPersistableDeckHtmlShellRuntime/
  );
});
