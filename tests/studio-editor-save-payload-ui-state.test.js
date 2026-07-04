const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadGetCurrentEditorPersistedDeckState(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadBuildPersistableDeckHtml(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.resolveEditorMetadataPersistenceOptions !== 'function') {
    const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
      fileContent,
      'function resolveEditorMetadataPersistenceOptions(options = {}) {',
      '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
    );
    vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
  }
  if (typeof context.buildEditorPersistableDeckSanitizerOptions !== 'function') {
    const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
      fileContent,
      'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
      '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
    );
    vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);
  }
  if (typeof context.sanitizeEditorReusablePersistedHtml !== 'function') {
    const sanitizeEditorReusablePersistedHtmlSource = extractFunctionSource(
      fileContent,
      'function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {',
      '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
    );
    vm.runInContext(sanitizeEditorReusablePersistedHtmlSource, context);
  }
  if (typeof context.resolveEditorReusablePersistedHtml !== 'function') {
    const resolveEditorReusablePersistedHtmlSource = extractFunctionSource(
      fileContent,
      'function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {',
      '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
    );
    vm.runInContext(resolveEditorReusablePersistedHtmlSource, context);
  }
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  vm.runInContext(helperSource, context);
}

function loadBuildEditorSaveRequestBody(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  vm.runInContext(helperSource, context);
}

test('buildEditorSaveRequestBody includes a canonical deck sidecar for save requests', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, doc);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, doc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(doc, '<html>persisted</html>', {
      presentationUrl: 'presentations/onboarding-presentation/index.html',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck'
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck',
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
});

test('buildEditorSaveRequestBody falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildPersistableDeckHtmlCalls = 0;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      buildPersistableDeckHtmlCalls += 1;
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>'
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(buildPersistableDeckHtmlCalls, 1);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorSaveRequestBody reuses a provided canonical deck override', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(null, null, {
      canonicalDeck
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('buildEditorSaveRequestBody falls back to the editor canonical deck when a provided override is malformed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const fallbackCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, fallbackCanonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return fallbackCanonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(null, null, {
      canonicalDeck: malformedCanonicalDeck
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(fallbackCanonicalDeck)
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorSaveRequestBody reuses the captured persistable deck state when clean html is not supplied', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    captureEditorPersistableDeckState(nextDoc, captureOptions = {}) {
      calls.push(['captureEditorPersistableDeckState', nextDoc, captureOptions]);
      assert.equal(nextDoc, doc);
      assert.equal(captureOptions.canonicalDeck, null);
      return {
        cleanHtml: '<html>captured</html>',
        canonicalDeck
      };
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when captureEditorPersistableDeckState provides html');
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when captureEditorPersistableDeckState provides a canonical deck');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.deepEqual(calls.map(([name]) => name), ['captureEditorPersistableDeckState']);
});

test('buildEditorSaveRequestBody delegates save-request deck-state resolution through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioSaveRequestDeckState(nextDoc, nextCleanHtml, options = {}) {
        delegatedArgs = {
          doc: nextDoc,
          cleanHtml: nextCleanHtml,
          canonicalDeck: options.canonicalDeck,
          capturePersistableDeckState: options.capturePersistableDeckState,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml
        };
        return {
          cleanHtml: '<html>captured</html>',
          canonicalDeck
        };
      }
    },
    captureEditorPersistableDeckState() {
      throw new Error('captureEditorPersistableDeckState should be delegated through the shared save-request helper');
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should be delegated through the shared save-request helper');
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when the shared save-request helper resolves the canonical deck');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(delegatedArgs.doc, doc);
  assert.equal(delegatedArgs.cleanHtml, null);
  assert.equal(delegatedArgs.canonicalDeck, null);
  assert.equal(typeof delegatedArgs.capturePersistableDeckState, 'function');
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
});

test('buildEditorSaveRequestBody reuses the shared save-request body builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioSaveRequestBodyBuilder(options = {}) {
        delegatedArgs = options;
        return (nextDoc, nextCleanHtml, nextOptions = {}) => ({
          doc: nextDoc,
          cleanHtml: nextCleanHtml,
          presentationUrl: Object.prototype.hasOwnProperty.call(nextOptions, 'presentationUrl')
            ? nextOptions.presentationUrl
            : options.getPresentationUrl(),
          resolveSaveRequestDeckState: typeof options.resolveSaveRequestDeckState,
          buildSaveRequestBody: typeof options.buildSaveRequestBody,
          capturePersistableDeckState: typeof options.capturePersistableDeckState,
          resolveCanonicalDeck: typeof options.resolveCanonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml === context.buildPersistableDeckHtml
        });
      }
    },
    captureEditorPersistableDeckState() {},
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when the save-request builder is delegated');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorSaveRequestBody(doc, null, {
      presentationUrl: 'presentations/custom/index.html',
      canonicalDeck
    }))),
    {
      doc: {
        label: 'iframe-doc'
      },
      cleanHtml: null,
      presentationUrl: 'presentations/custom/index.html',
      resolveSaveRequestDeckState: 'function',
      buildSaveRequestBody: 'function',
      capturePersistableDeckState: 'function',
      resolveCanonicalDeck: 'function',
      buildPersistableDeckHtml: true
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), 'presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.resolveSaveRequestDeckState, context.SlideNextStudioEditorPersistence.resolveStudioSaveRequestDeckState);
  assert.equal(delegatedArgs.buildSaveRequestBody, context.SlideNextStudioEditorPersistence.buildStudioSaveRequestBody);
  assert.equal(delegatedArgs.capturePersistableDeckState, context.captureEditorPersistableDeckState);
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
});

test('isCurrentDeckStatePersisted reuses the shared persisted-save-request checker when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckStatePersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {',
    '\n\n    function createCurrentStudioPersistenceHandlerOptions(options = {}) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    lastPersistedDeckHtml: '<html></html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null,
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistedSaveRequestChecker(options = {}) {
        delegatedArgs = options;
        return (saveRequestBody, nextCleanHtml) => ({
          saveRequestBody,
          cleanHtml: nextCleanHtml,
          persistedDeckState: options.readPersistedDeckState(),
          isPersistedSaveRequest: typeof options.isPersistedSaveRequest
        });
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(isCurrentDeckStatePersistedSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.isCurrentDeckStatePersisted({
      htmlContent: '<html></html>',
      canonicalDeck
    }))),
    {
      saveRequestBody: {
        htmlContent: '<html></html>',
        canonicalDeck
      },
      cleanHtml: '<html></html>',
      persistedDeckState: {
        cleanHtml: '<html></html>',
        canonicalDeck,
        playbackState: null
      },
      isPersistedSaveRequest: 'function'
    }
  );
  assert.equal(delegatedArgs.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
  assert.equal(delegatedArgs.isPersistedSaveRequest, context.SlideNextStudioEditorPersistence.isStudioPersistedSaveRequest);
});

test('resolveCurrentStudioPersistenceStateFromCapture reuses the shared capture-state resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveCurrentStudioPersistenceStateFromCaptureSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceStateFromDocumentCaptureResolver(options = {}) {
        delegatedArgs = options;
        return (nextDoc, nextOptions = {}) => ({
          doc: nextDoc,
          presentationUrl: typeof nextOptions.presentationUrl === 'string' && nextOptions.presentationUrl
            ? nextOptions.presentationUrl
            : options.getPresentationUrl(),
          capturePersistableDeckState: typeof (
            typeof nextOptions.capturePersistableDeckState === 'function'
              ? nextOptions.capturePersistableDeckState
              : options.capturePersistableDeckState
          ),
          persistenceOptions: nextOptions.persistenceOptions || {},
          resolvePersistenceStateFromCapture: typeof nextOptions.resolvePersistenceStateFromCapture
        });
      },
      resolveStudioPersistenceStateFromDocumentCapture() {
        throw new Error('capture-state resolution should be delegated through the shared builder');
      }
    },
    captureEditorPersistableDeckState() {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveCurrentStudioPersistenceStateFromCaptureSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioPersistenceStateFromCapture(doc, {
      persistenceOptions: {
        sessionToken: 12
      },
      resolvePersistenceStateFromCapture() {}
    }))),
    {
      doc: {
        label: 'iframe-doc'
      },
      presentationUrl: 'presentations/onboarding-presentation/index.html',
      capturePersistableDeckState: 'function',
      persistenceOptions: {
        sessionToken: 12
      },
      resolvePersistenceStateFromCapture: 'function'
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), 'presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.capturePersistableDeckState, context.captureEditorPersistableDeckState);
  assert.equal(delegatedArgs.resolvePersistenceStateFromDocumentCapture, context.SlideNextStudioEditorPersistence.resolveStudioPersistenceStateFromDocumentCapture);
});

test('buildEditorSaveRequestBody reuses the local canonical override helper when capture state omits a canonical deck', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    __resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      assert.equal(nextCanonicalDeck, null);
      assert.equal(typeof options.buildCanonicalDeck, 'function');
      return canonicalDeck;
    },
    captureEditorPersistableDeckState(nextDoc, captureOptions = {}) {
      calls.push(['captureEditorPersistableDeckState', nextDoc, captureOptions]);
      assert.equal(nextDoc, doc);
      assert.equal(captureOptions.canonicalDeck, null);
      return {
        cleanHtml: '<html>captured</html>'
      };
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when captureEditorPersistableDeckState provides html');
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when resolveEditorCanonicalDeckOverride is available');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);
  vm.runInContext(
    'resolveEditorCanonicalDeckOverride = __resolveEditorCanonicalDeckOverride;',
    context
  );

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'captureEditorPersistableDeckState');
  assert.equal(calls[1][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[1][1], null);
  assert.equal(typeof calls[1][2], 'function');
});

test('resolveEditorPersistedDeckStateWithContent reuses getCurrentEditorPersistedDeckState.resolveWithContent when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    __resolveWithContent(persistedDeckState) {
      calls.push(persistedDeckState);
      return persistedDeckState;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext('getCurrentEditorPersistedDeckState.resolveWithContent = __resolveWithContent;', context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorPersistedDeckStateWithContent())),
    {
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck: null,
      playbackState: null
    }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck: null,
      playbackState: null
    }
  ]);
});

test('resolveEditorPersistedDeckStateWithContent reuses the shared persisted-state content resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateContentResolver(options = {}) {
        delegatedArgs = options;
        return (persistedDeckState) => persistedDeckState;
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(
    'getCurrentEditorPersistedDeckState.resolveWithContent = (persistedDeckState) => persistedDeckState;',
    context
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorPersistedDeckStateWithContent())),
    {
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck: null,
      playbackState: null
    }
  );
  assert.equal(delegatedArgs.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
  assert.equal(delegatedArgs.resolveWithContent, context.getCurrentEditorPersistedDeckState.resolveWithContent);
});

test('resolveEditorCapturedPersistableDeckState reuses the shared captured-state resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCapturedPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCapturedPersistableDeckState(cleanHtml = \'\', options = {}) {',
    '\n\n    function captureEditorPersistableDeckState(doc = getIframeDoc()) {'
  );

  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1']
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioCapturedPersistableDeckStateResolver(options = {}) {
        delegatedArgs = options;
        return (nextCleanHtml, nextOptions = {}) => ({
          cleanHtml: nextCleanHtml,
          canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
            ? nextOptions.canonicalDeck
            : options.buildCanonicalDeck(),
          playbackState: Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
            ? nextOptions.playbackState
            : (
                typeof nextOptions.resolvePlaybackState === 'function'
                  ? nextOptions.resolvePlaybackState(nextOptions.canonicalDeck || null)
                  : options.resolvePlaybackState(nextOptions.canonicalDeck || null)
              )
        });
      },
      resolveStudioCapturedPersistableDeckState() {
        throw new Error('captured persistable deck state resolution should be delegated through the shared resolver builder');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCapturedPersistableDeckStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorCapturedPersistableDeckState('<html>persisted</html>', {
      canonicalDeck,
      resolvePlaybackState(nextCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        return playbackState;
      }
    }))),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState: {
        activeSlideIds: ['slide-1']
      }
    }
  );
  assert.equal(delegatedArgs.resolveCapturedPersistableDeckState, context.SlideNextStudioEditorPersistence.resolveStudioCapturedPersistableDeckState);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(delegatedArgs.buildCanonicalDeck(), null);
  assert.equal(typeof delegatedArgs.resolvePlaybackState, 'function');
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.resolvePlaybackState(canonicalDeck))),
    {
      activeSlideIds: ['slide-1']
    }
  );
});

test('captureEditorPersistableDeckBuildState reuses the shared build-state capturer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureEditorPersistableDeckBuildStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckBuildState(doc = getIframeDoc(), buildOptions = {}) {',
    '\n\n    function resolveEditorCapturedPersistableDeckState(cleanHtml = \'\', options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  let delegatedArgs = null;
  const explicitCaptureStudioPersistableDeckBuildState = () => ({ cleanHtml: '<html>capture</html>' });
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckBuildStateCapturer(options = {}) {
        delegatedArgs = options;
        return (nextDoc, nextOptions = {}) => ({
          doc: nextDoc,
          canonicalDeck: nextOptions.canonicalDeck,
          onCanonicalDeckResolved: typeof nextOptions.onCanonicalDeckResolved,
          onPlaybackStateResolved: typeof nextOptions.onPlaybackStateResolved,
          capturePersistableDeckBuildState: typeof options.capturePersistableDeckBuildState,
          html: options.buildPersistableDeckHtml(nextDoc, nextOptions)
        });
      },
      captureStudioPersistableDeckBuildState() {
        throw new Error('persistable deck build-state capture should be delegated through the shared capturer builder');
      }
    },
    buildPersistableDeckHtml(nextDoc, nextOptions = {}) {
      calls.push(['buildPersistableDeckHtml', nextDoc, nextOptions]);
      return '<html>persisted</html>';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(captureEditorPersistableDeckBuildStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureEditorPersistableDeckBuildState(iframeDoc, {
      canonicalDeck,
      captureStudioPersistableDeckBuildState: explicitCaptureStudioPersistableDeckBuildState,
      onCanonicalDeckResolved() {},
      onPlaybackStateResolved() {}
    }))),
    {
      doc: {
        label: 'iframe-doc'
      },
      canonicalDeck,
      onCanonicalDeckResolved: 'function',
      onPlaybackStateResolved: 'function',
      capturePersistableDeckBuildState: 'function',
      html: '<html>persisted</html>'
    }
  );
  assert.equal(delegatedArgs.capturePersistableDeckBuildState, explicitCaptureStudioPersistableDeckBuildState);
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
  assert.equal(calls[0][0], 'buildPersistableDeckHtml');
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[0][2].canonicalDeck, canonicalDeck);
  assert.equal(typeof calls[0][2].onCanonicalDeckResolved, 'function');
  assert.equal(typeof calls[0][2].onPlaybackStateResolved, 'function');
});

test('captureEditorPersistableDeckState reuses the shared persistable-deck-state capturer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1']
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckStateCapturer(options = {}) {
        delegatedArgs = options;
        return (nextDoc, nextOptions = {}) => ({
          doc: nextDoc,
          canonicalDeck: nextOptions.canonicalDeck,
          builtCanonicalDeck: options.buildCanonicalDeck(),
          playbackState: options.resolvePlaybackState(nextOptions.canonicalDeck || null)
        });
      },
      captureStudioPersistableDeckState() {
        throw new Error('persistable deck state capture should be delegated through the shared capturer builder');
      }
    },
    captureEditorPersistableDeckBuildState() {},
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      return nextCanonicalDeck || (
        typeof options.buildCanonicalDeck === 'function'
          ? options.buildCanonicalDeck()
          : null
      );
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when a canonical override is provided');
    },
    capturePersistedDeckPlaybackState(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(captureEditorPersistableDeckStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState(iframeDoc, {
      canonicalDeck
    }))),
    {
      doc: {
        label: 'iframe-doc'
      },
      canonicalDeck,
      builtCanonicalDeck: canonicalDeck,
      playbackState: {
        activeSlideIds: ['slide-1']
      }
    }
  );
  assert.equal(delegatedArgs.capturePersistableDeckState, context.SlideNextStudioEditorPersistence.captureStudioPersistableDeckState);
  assert.equal(delegatedArgs.captureBuildState, context.captureEditorPersistableDeckBuildState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.resolvePlaybackState(canonicalDeck))),
    {
      activeSlideIds: ['slide-1']
    }
  );
});

test('buildPersistableDeckHtml falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let sharedBuildCalls = 0;
  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reuses a provided canonical deck when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    __resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      assert.equal(typeof options.buildCanonicalDeck, 'function');
      return canonicalDeck;
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext(
    'resolveEditorCanonicalDeckOverride = __resolveEditorCanonicalDeckOverride;',
    context
  );

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      canonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[0][1], canonicalDeck);
  assert.equal(typeof calls[0][2], 'function');
});

test('buildPersistableDeckHtml falls back to the editor canonical deck when a provided override is malformed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      canonicalDeck: malformedCanonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reports the resolved canonical deck when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let reportedCanonicalDeck = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      }
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
});

test('resolveEditorReusablePersistedHtml delegates reusable persisted html resolution through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const persistedDeckState = {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck,
    playbackState: null
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioReusablePersistedHtml(nextPersistedDeckState, options = {}) {
        delegatedArgs = { persistedDeckState: nextPersistedDeckState, options };
        return nextPersistedDeckState.cleanHtml;
      },
      resolveStudioPersistedHtmlReuse() {
        throw new Error('persisted html reuse should be delegated through the shared reusable-html helper');
      },
      isStudioPersistedCanonicalDeck() {
        throw new Error('canonical fallback should not run when reusable persisted html resolution is delegated');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorReusablePersistedHtmlSource, context);

  assert.equal(
    context.resolveEditorReusablePersistedHtml(persistedDeckState, {
      canonicalDeck,
      persistedHtml: '<html>persisted-baseline</html>',
      persistedCanonicalDeck: canonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(delegatedArgs.persistedDeckState, persistedDeckState);
  assert.equal(delegatedArgs.options.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.persistedCanonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.options.resolvePersistedHtmlReuse, 'function');
  assert.equal(typeof delegatedArgs.options.isPersistedCanonicalDeck, 'function');
});

test('resolveEditorReusablePersistedHtml reuses the shared reusable-html resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const persistedDeckState = {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck,
    playbackState: null
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioReusablePersistedHtmlResolver(options = {}) {
        delegatedArgs = options;
        return (nextPersistedDeckState, nextOptions = {}) => ({
          persistedDeckState: nextPersistedDeckState,
          canonicalDeck: nextOptions.canonicalDeck,
          persistedHtml: nextOptions.persistedHtml,
          persistedCanonicalDeck: nextOptions.persistedCanonicalDeck,
          resolvePersistedHtmlReuse: typeof (
            typeof nextOptions.resolvePersistedHtmlReuse === 'function'
              ? nextOptions.resolvePersistedHtmlReuse
              : options.resolvePersistedHtmlReuse
          ),
          isPersistedCanonicalDeck: typeof (
            typeof nextOptions.isPersistedCanonicalDeck === 'function'
              ? nextOptions.isPersistedCanonicalDeck
              : options.isPersistedCanonicalDeck
          )
        });
      },
      resolveStudioReusablePersistedHtml() {
        throw new Error('reusable persisted html resolution should be delegated through the shared resolver builder');
      },
      resolveStudioPersistedHtmlReuse() {
        throw new Error('persisted html reuse should be delegated through the shared resolver builder');
      },
      isStudioPersistedCanonicalDeck() {
        throw new Error('canonical deck comparison should be delegated through the shared resolver builder');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorReusablePersistedHtmlSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorReusablePersistedHtml(persistedDeckState, {
      canonicalDeck,
      persistedHtml: '<html>persisted-baseline</html>',
      persistedCanonicalDeck: canonicalDeck
    }))),
    {
      persistedDeckState: {
        cleanHtml: '<html>persisted-baseline</html>',
        canonicalDeck,
        playbackState: null
      },
      canonicalDeck,
      persistedHtml: '<html>persisted-baseline</html>',
      persistedCanonicalDeck: canonicalDeck,
      resolvePersistedHtmlReuse: 'function',
      isPersistedCanonicalDeck: 'function'
    }
  );
  assert.equal(delegatedArgs.resolveReusablePersistedHtml, context.SlideNextStudioEditorPersistence.resolveStudioReusablePersistedHtml);
  assert.equal(delegatedArgs.resolvePersistedHtmlReuse, context.SlideNextStudioEditorPersistence.resolveStudioPersistedHtmlReuse);
  assert.equal(delegatedArgs.isPersistedCanonicalDeck, context.SlideNextStudioEditorPersistence.isStudioPersistedCanonicalDeck);
});

test('resolveEditorMetadataPersistenceOptions delegates through the shared metadata persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioMetadataPersistenceOptions(options = {}) {
        delegatedArgs = options;
        return {
          emptyContainerIds: ['pixelMatrix'],
          transientClassNames: ['revealed']
        };
      }
    },
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions() {
        throw new Error('merged persistence resolution should be delegated through the shared metadata helper');
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions({
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      transientClassNames: ['revealed']
    }
  );
  assert.equal(delegatedArgs.currentPresentationMetadata, currentPresentationMetadata);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.persistenceOptions)),
    {
      transientClassNames: ['revealed']
    }
  );
  assert.equal(typeof delegatedArgs.resolveMergedPresentationPersistenceOptions, 'function');
});

test('resolveEditorMetadataPersistenceOptions reuses the shared metadata persistence resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioMetadataPersistenceOptionsResolver(options = {}) {
        delegatedArgs = options;
        return (nextOptions = {}) => ({
          currentPresentationMetadata: Object.prototype.hasOwnProperty.call(nextOptions, 'currentPresentationMetadata')
            ? nextOptions.currentPresentationMetadata
            : options.getCurrentPresentationMetadata(),
          persistenceOptions: nextOptions.persistenceOptions || {}
        });
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions({
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }))),
    {
      currentPresentationMetadata,
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }
  );
  assert.equal(typeof delegatedArgs.getCurrentPresentationMetadata, 'function');
  assert.equal(delegatedArgs.getCurrentPresentationMetadata(), currentPresentationMetadata);
  assert.equal(delegatedArgs.resolveMergedPresentationPersistenceOptions, null);
  assert.equal(delegatedArgs.resolvePresentationPersistenceOptions, null);
  assert.equal(delegatedArgs.mergePresentationPersistenceOptions, null);
});

test('resolveEditorMetadataPersistenceOptions prefers the shared merged persistence resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions(metadata, explicitOptions) {
        calls.push(['resolveMergedPresentationPersistenceOptions', metadata, explicitOptions]);
        return {
          emptyContainerIds: ['pixelMatrix'],
          transientClassNames: ['revealed']
        };
      },
      resolvePresentationPersistenceOptions() {
        throw new Error('resolvePresentationPersistenceOptions should not run when merged resolver is available');
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions())),
    {
      emptyContainerIds: ['pixelMatrix'],
      transientClassNames: ['revealed']
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls)),
    [[
      'resolveMergedPresentationPersistenceOptions',
      currentPresentationMetadata,
      {}
    ]]
  );
});

test('resolveEditorMetadataPersistenceOptions merges explicit persistence options when the merged resolver is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        calls.push(['resolvePresentationPersistenceOptions', metadata]);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    },
    SlideNextPresentationMetadata: {
      mergePresentationPersistenceOptions(...optionSets) {
        calls.push(['mergePresentationPersistenceOptions', optionSets]);
        return optionSets.reduce((merged, optionSet) => ({
          ...merged,
          ...(optionSet || {})
        }), {});
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions({
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      transientClassNames: ['revealed']
    }
  );
  assert.deepEqual(calls[0], ['resolvePresentationPersistenceOptions', currentPresentationMetadata]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1])),
    [
      'mergePresentationPersistenceOptions',
      [
        { emptyContainerIds: ['pixelMatrix'] },
        { transientClassNames: ['revealed'] }
      ]
    ]
  );
});

test('buildEditorPersistableDeckSanitizerOptions composes metadata cleanup, chrome filters, and playback state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
    '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
  );

  const calls = [];
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {};

  vm.createContext(context);
  vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
      resolveMetadataPersistenceOptions() {
        calls.push(['resolveMetadataPersistenceOptions']);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      },
      getDeckSanitizerOptions() {
        calls.push(['getDeckSanitizerOptions']);
        return {
          chromeNodeIds: ['editorSelectionOverlay'],
          transientClassNames: ['revealed'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id'
        };
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-2']
      }
    }
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'getDeckSanitizerOptions',
    'resolveMetadataPersistenceOptions'
  ]);
});

test('buildEditorPersistableDeckSanitizerOptions delegates through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
    '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
  );

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      buildStudioPersistableDeckSanitizerOptions(nextPlaybackState, options = {}) {
        delegatedArgs = {
          playbackState: nextPlaybackState,
          resolveMetadataPersistenceOptions: options.resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions: options.getDeckSanitizerOptions
        };
        return {
          emptyContainerIds: ['pixelMatrix'],
          editorChromeNodeIds: ['editorSelectionOverlay'],
          editorTransientClasses: ['revealed'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id',
          persistedDeckPlaybackState: nextPlaybackState
        };
      }
    },
    getEditorDeckSanitizerOptions() {
      throw new Error('getEditorDeckSanitizerOptions should be delegated through the shared persistence helper');
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
      resolveMetadataPersistenceOptions() {
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-2']
      }
    }
  );
  assert.equal(delegatedArgs.playbackState, playbackState);
  assert.equal(typeof delegatedArgs.resolveMetadataPersistenceOptions, 'function');
  assert.equal(delegatedArgs.getDeckSanitizerOptions, context.getEditorDeckSanitizerOptions);
});

test('buildEditorPersistableDeckSanitizerOptions reuses the shared sanitizer-options builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
    '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
  );

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckSanitizerOptionsBuilder(options = {}) {
        delegatedArgs = options;
        return (nextPlaybackState, nextOptions = {}) => ({
          playbackState: nextPlaybackState,
          metadataOptions: (
            typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
              ? nextOptions.resolveMetadataPersistenceOptions
              : options.resolveMetadataPersistenceOptions
          )(),
          deckSanitizerOptions: (
            typeof nextOptions.getDeckSanitizerOptions === 'function'
              ? nextOptions.getDeckSanitizerOptions
              : options.getDeckSanitizerOptions
          )()
        });
      }
    },
    getEditorDeckSanitizerOptions() {
      return {
        chromeNodeIds: ['editorSelectionOverlay'],
        transientClassNames: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id'
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
      resolveMetadataPersistenceOptions() {
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    }))),
    {
      playbackState: {
        activeSlideIds: ['slide-2']
      },
      metadataOptions: {
        emptyContainerIds: ['pixelMatrix']
      },
      deckSanitizerOptions: {
        chromeNodeIds: ['editorSelectionOverlay'],
        transientClassNames: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id'
      }
    }
  );
  assert.equal(typeof delegatedArgs.resolveMetadataPersistenceOptions, 'function');
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.resolveMetadataPersistenceOptions())),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
  assert.equal(delegatedArgs.getDeckSanitizerOptions, context.getEditorDeckSanitizerOptions);
});

test('sanitizeEditorReusablePersistedHtml reuses the local persistable deck sanitizer options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sanitizeEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const parsedDoc = {
    documentElement: {
      nodeName: 'HTML'
    }
  };
  const calls = [];
  let delegatedSanitizerOptions = null;
  const context = {
    DOMParser: class DOMParser {
      parseFromString(html, type) {
        calls.push(['parseFromString', html, type]);
        return parsedDoc;
      }
    },
    __buildEditorPersistableDeckSanitizerOptions(nextPlaybackState, options = {}) {
      delegatedSanitizerOptions = {
        playbackState: nextPlaybackState,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions(),
        deckSanitizerOptions: options.getDeckSanitizerOptions()
      };
      return {
        emptyContainerIds: ['pixelMatrix'],
        editorChromeNodeIds: ['editorSelectionOverlay'],
        editorTransientClasses: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id',
        persistedDeckPlaybackState: nextPlaybackState
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(sanitizeEditorReusablePersistedHtmlSource, context);
  vm.runInContext('buildEditorPersistableDeckSanitizerOptions = __buildEditorPersistableDeckSanitizerOptions;', context);

  assert.equal(
    context.sanitizeEditorReusablePersistedHtml('<html>persisted-baseline</html>', {
      playbackState,
      resolveMetadataPersistenceOptions() {
        calls.push(['resolveMetadataPersistenceOptions']);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      },
      getDeckSanitizerOptions() {
        calls.push(['getDeckSanitizerOptions']);
        return {
          chromeNodeIds: ['editorSelectionOverlay'],
          transientClassNames: ['revealed'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id'
        };
      },
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>sanitized</html>';
      }
    }),
    '<html>sanitized</html>'
  );
  assert.deepEqual(calls[0], ['parseFromString', '<html>persisted-baseline</html>', 'text/html']);
  assert.deepEqual(calls[1], ['resolveMetadataPersistenceOptions']);
  assert.deepEqual(calls[2], ['getDeckSanitizerOptions']);
  assert.equal(delegatedSanitizerOptions.playbackState, playbackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedSanitizerOptions.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedSanitizerOptions.deckSanitizerOptions)),
    {
      chromeNodeIds: ['editorSelectionOverlay'],
      transientClassNames: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id'
    }
  );
  assert.equal(calls[3][0], 'buildPersistableDeckHtml');
  assert.equal(calls[3][1], parsedDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[3][2])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-2']
      }
    }
  );
});

test('sanitizeEditorReusablePersistedHtml delegates through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sanitizeEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      sanitizeStudioReusablePersistedHtml(persistedHtml, options = {}) {
        delegatedArgs = {
          persistedHtml,
          playbackState: options.playbackState,
          resolveMetadataPersistenceOptions: options.resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions: options.getDeckSanitizerOptions,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          DOMParser: options.DOMParser
        };
        return '<html>sanitized</html>';
      }
    },
    DOMParser: class DOMParser {},
    getEditorDeckSanitizerOptions() {
      throw new Error('getEditorDeckSanitizerOptions should be delegated through the shared persistence helper');
    }
  };

  vm.createContext(context);
  vm.runInContext(sanitizeEditorReusablePersistedHtmlSource, context);

  assert.equal(
    context.sanitizeEditorReusablePersistedHtml('<html>persisted-baseline</html>', {
      playbackState,
      resolveMetadataPersistenceOptions() {
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      },
      buildPersistableDeckHtml() {
        throw new Error('buildPersistableDeckHtml should be delegated through the shared persistence helper');
      }
    }),
    '<html>sanitized</html>'
  );
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.playbackState, playbackState);
  assert.equal(typeof delegatedArgs.resolveMetadataPersistenceOptions, 'function');
  assert.equal(delegatedArgs.getDeckSanitizerOptions, context.getEditorDeckSanitizerOptions);
  assert.equal(typeof delegatedArgs.buildPersistableDeckHtml, 'function');
  assert.equal(delegatedArgs.DOMParser, context.DOMParser);
});

test('buildPersistableDeckHtml delegates the no-document persistence flow through the shared helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      buildStudioPersistableDeckHtmlWithoutDocument(options = {}) {
        delegatedArgs = {
          getPersistedDeckState: options.getPersistedDeckState,
          resolvePersistedDeckStateWithContent: options.resolvePersistedDeckStateWithContent,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          onCanonicalDeckResolved: options.onCanonicalDeckResolved,
          onPlaybackStateResolved: options.onPlaybackStateResolved,
          resolveReusablePersistedHtml: options.resolveReusablePersistedHtml,
          sanitizeReusablePersistedHtml: options.sanitizeReusablePersistedHtml,
          buildSourceDeckHtml: options.buildSourceDeckHtml
        };
        options.onCanonicalDeckResolved(canonicalDeck);
        options.onPlaybackStateResolved(playbackState);
        return '<html>persisted-baseline</html>';
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when the shared no-document helper resolves the html');
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;
  assert.equal(
    context.buildPersistableDeckHtml(null, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      },
      onPlaybackStateResolved(nextPlaybackState) {
        reportedPlaybackState = nextPlaybackState;
      }
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
  assert.equal(typeof delegatedArgs.getPersistedDeckState, 'function');
  assert.equal(typeof delegatedArgs.resolvePersistedDeckStateWithContent, 'function');
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.onCanonicalDeckResolved, 'function');
  assert.equal(typeof delegatedArgs.onPlaybackStateResolved, 'function');
  assert.equal(typeof delegatedArgs.resolveReusablePersistedHtml, 'function');
  assert.equal(typeof delegatedArgs.sanitizeReusablePersistedHtml, 'function');
  assert.equal(typeof delegatedArgs.buildSourceDeckHtml, 'function');
});

test('buildPersistableDeckHtml reuses the local reusable persisted html resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let delegatedArgs = null;
  let sharedBuildCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {
      delegatedArgs = { persistedDeckState, options };
      return persistedDeckState.cleanHtml;
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(delegatedArgs.persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.persistedDeckState.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.persistedCanonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml reports canonical deck and playback state when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when persisted html reuse succeeds');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState) {
      return persistedDeckState.cleanHtml;
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      },
      onPlaybackStateResolved(nextPlaybackState) {
        reportedPlaybackState = nextPlaybackState;
      }
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
});

test('buildPersistableDeckHtml reuses the local persisted deck state-with-content resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const calls = [];
  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when persisted html reuse succeeds');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorPersistedDeckStateWithContent(persistedDeckState) {
      calls.push(['resolveEditorPersistedDeckStateWithContent', persistedDeckState]);
      return persistedDeckState;
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {
      delegatedArgs = { persistedDeckState, options };
      return persistedDeckState.cleanHtml;
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorPersistedDeckStateWithContent = __resolveEditorPersistedDeckStateWithContent;', context);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck,
    playbackState: null
  });
  assert.equal(delegatedArgs.persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.persistedHtml, '<html>persisted-baseline</html>');
});

test('buildPersistableDeckHtml reuses the local reusable persisted html sanitizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let delegatedArgs = null;
  let sharedBuildCalls = 0;
  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix']
      };
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState) {
      calls.push(['resolveEditorReusablePersistedHtml', persistedDeckState]);
      return persistedDeckState.cleanHtml;
    },
    __sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {
      delegatedArgs = {
        persistedHtml,
        options,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions()
      };
      return '<html>sanitized-persisted</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);
  vm.runInContext('sanitizeEditorReusablePersistedHtml = __sanitizeEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>sanitized-persisted</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.deepEqual(calls.map(([name]) => name), [
    'resolveEditorReusablePersistedHtml',
    'resolveEditorMetadataPersistenceOptions'
  ]);
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.playbackState, playbackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
});

test('buildPersistableDeckHtml delegates the live-document persistence flow through the shared helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  let delegatedArgs = null;
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;
  const context = {
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared deck persistence builder should be delegated through the shared live-document helper');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      buildStudioPersistableDeckHtmlFromDocument(nextDoc, options = {}) {
        delegatedArgs = {
          doc: nextDoc,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          resolvePlaybackState: options.resolvePlaybackState,
          onCanonicalDeckResolved: options.onCanonicalDeckResolved,
          onPlaybackStateResolved: options.onPlaybackStateResolved,
          buildPersistableDeckSanitizerOptions: options.buildPersistableDeckSanitizerOptions,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml
        };
        options.onCanonicalDeckResolved(canonicalDeck);
        options.onPlaybackStateResolved(playbackState);
        return '<html>persisted-live</html>';
      }
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      },
      onPlaybackStateResolved(nextPlaybackState) {
        reportedPlaybackState = nextPlaybackState;
      }
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.resolvePlaybackState, 'function');
  assert.equal(typeof delegatedArgs.onCanonicalDeckResolved, 'function');
  assert.equal(typeof delegatedArgs.onPlaybackStateResolved, 'function');
  assert.equal(typeof delegatedArgs.buildPersistableDeckSanitizerOptions, 'function');
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.SlideNextDeckPersistence.buildPersistableDeckHtml);
});

test('buildPersistableDeckHtml reuses the local persistable deck sanitizer options helper when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const calls = [];
  let delegatedArgs = null;
  const context = {
    __buildEditorPersistableDeckSanitizerOptions(nextPlaybackState, options = {}) {
      delegatedArgs = {
        playbackState: nextPlaybackState,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions()
      };
      return {
        emptyContainerIds: ['pixelMatrix'],
        editorChromeNodeIds: ['editorSelectionOverlay'],
        editorTransientClasses: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id',
        persistedDeckPlaybackState: nextPlaybackState
      };
    },
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix']
      };
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return livePlaybackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('buildEditorPersistableDeckSanitizerOptions = __buildEditorPersistableDeckSanitizerOptions;', context);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.equal(delegatedArgs.playbackState, livePlaybackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolveEditorMetadataPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-3'],
        slideCounterText: '3 / 5'
      }
    }
  );
});

test('buildPersistableDeckHtml prefers the shared persisted-content resolver before checking html reuse', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when persisted html reuse succeeds');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioPersistedDeckStateSnapshotWithContent(options = {}) {
        calls.push(['resolveStudioPersistedDeckStateSnapshotWithContent', options]);
        return options.persistedDeckState;
      },
      resolveStudioPersistableDeckStateWithContent(persistedDeckState) {
        calls.push(['resolveStudioPersistableDeckStateWithContent', persistedDeckState]);
        return persistedDeckState;
      },
      resolveStudioPersistedHtmlReuse(persistedDeckState, options = {}) {
        calls.push(['resolveStudioPersistedHtmlReuse', persistedDeckState, options]);
        return persistedDeckState.cleanHtml;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'resolveStudioPersistedDeckStateSnapshotWithContent',
    'resolveStudioPersistedHtmlReuse'
  ]);
  assert.equal(calls[0][1].persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(calls[1][1].cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(calls[1][2].canonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml sanitizes reusable persisted html when a DOM parser is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const parsedDoc = {
    documentElement: { outerHTML: '<html>parsed</html>' }
  };
  const playbackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const parserCalls = [];
  const buildCalls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    DOMParser: class DOMParser {
      parseFromString(html, type) {
        parserCalls.push([html, type]);
        return parsedDoc;
      }
    },
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        assert.equal(metadata, context.currentPresentationMetadata);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        buildCalls.push([nextDoc, options]);
        return '<html>sanitized-baseline</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioPersistedHtmlReuse(persistedDeckState, options = {}) {
        assert.equal(persistedDeckState.playbackState, playbackState);
        assert.equal(options.canonicalDeck, canonicalDeck);
        return persistedDeckState.cleanHtml;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentPresentationMetadata: {
      id: 'computer-vision-presentation',
      persistence: {
        emptyContainerIds: ['pixelMatrix']
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>sanitized-baseline</html>');
  assert.deepEqual(parserCalls, [['<html>persisted-baseline</html>', 'text/html']]);
  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0][0], parsedDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(buildCalls[0][1])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay'],
      editorTransientClasses: ['editor-selected', 'editor-hoverable', 'editor-dragging'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: playbackState
    }
  );
});

test('buildPersistableDeckHtml captures the live playback state before persisting iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return livePlaybackState;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].editorChromeNodeIds)),
    ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].editorTransientClasses)),
    ['editor-selected', 'editor-hoverable', 'editor-dragging']
  );
  assert.equal(calls[1][2].editorElementIdAttr, 'data-editor-id');
  assert.equal(calls[1][2].editorSlideIdAttr, 'data-slide-id');
  assert.equal(calls[1][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml forwards metadata-derived persistence cleanup options when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix'],
      styleCleanups: [
        {
          selector: '.glass-panel, h1',
          properties: ['transform', 'opacity']
        }
      ]
    }
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        calls.push(['resolvePresentationPersistenceOptions', metadata]);
        assert.equal(metadata, currentPresentationMetadata);
        return {
          emptyContainerIds: ['pixelMatrix'],
          styleCleanups: [
            {
              selector: '.glass-panel, h1',
              properties: ['transform', 'opacity']
            }
          ]
        };
      }
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return livePlaybackState;
    },
    currentPresentationMetadata,
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolvePresentationPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].emptyContainerIds)),
    ['pixelMatrix']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].styleCleanups)),
    [
      {
        selector: '.glass-panel, h1',
        properties: ['transform', 'opacity']
      }
    ]
  );
  assert.equal(calls[2][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml reuses the local metadata persistence resolver when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix'],
        transientClassNames: ['revealed']
      };
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return livePlaybackState;
    },
    currentPresentationMetadata,
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolveEditorMetadataPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].emptyContainerIds)),
    ['pixelMatrix']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].transientClassNames)),
    ['revealed']
  );
  assert.equal(calls[2][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml does not reuse stale persisted playback state when the live iframe has no playback markers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[1][2].persistedDeckPlaybackState, null);
});

test('buildPersistableDeckHtml reuses a provided canonical deck when playback-state fallback needs the current session slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.deepEqual(
          JSON.parse(JSON.stringify(options.persistedDeckPlaybackState)),
          {
            activeSlideIds: ['slide-2'],
            slideCounterText: '2 / 5'
          }
        );
        return '<html>persisted-live</html>';
      },
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return {
          activeSlideIds: [],
          slideCounterText: '2 / 5'
        };
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      canonicalDeck
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('capturePersistedDeckPlaybackState preserves explicit live active slide ids from shared playback capture', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return { label: 'active-slide' };
    }
  };
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return playbackState;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      };
    },
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-live';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.equal(context.capturePersistedDeckPlaybackState(), playbackState);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('capturePersistedDeckPlaybackState delegates fallback active slide resolution to the shared deck persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: [],
    slideCounterText: '2 / 5'
  };
  let delegatedArgs = null;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return playbackState;
      },
      ensurePersistedDeckPlaybackStateActiveSlideId(nextPlaybackState, options) {
        delegatedArgs = {
          nextPlaybackState,
          options,
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(nextPlaybackState)
        };
        return {
          activeSlideIds: [delegatedArgs.fallbackActiveSlideId],
          slideCounterText: nextPlaybackState.slideCounterText
        };
      }
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState())),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.equal(delegatedArgs.nextPlaybackState, playbackState);
  assert.equal(typeof delegatedArgs.options.resolveFallbackActiveSlideId, 'function');
  assert.equal(delegatedArgs.fallbackActiveSlideId, 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('capturePersistedDeckPlaybackState delegates playback capture with fallback through the shared deck persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  let delegatedArgs = null;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState() {
        throw new Error('capturePersistedDeckPlaybackState should be delegated through the shared fallback helper');
      },
      ensurePersistedDeckPlaybackStateActiveSlideId() {
        throw new Error('ensurePersistedDeckPlaybackStateActiveSlideId should be delegated through the shared fallback helper');
      },
      capturePersistedDeckPlaybackStateWithFallback(doc, options = {}) {
        delegatedArgs = {
          doc,
          getSlides: options.getSlides,
          slideIdAttr: options.slideIdAttr,
          resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId
        };
        return {
          activeSlideIds: [options.resolveFallbackActiveSlideId()],
          slideCounterText: '2 / 5'
        };
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when a canonical deck is provided');
    },
    resolveEditorFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return 'slide-2';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState(iframeDoc, canonicalDeck))),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.deepEqual(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.getSlides, context.getSlides);
  assert.equal(delegatedArgs.slideIdAttr, 'data-slide-id');
  assert.equal(typeof delegatedArgs.resolveFallbackActiveSlideId, 'function');
});

test('capturePersistedDeckPlaybackState reuses the shared playback-state capturer builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckPlaybackStateCapturer(options = {}) {
        delegatedArgs = options;
        return (nextDoc) => ({
          doc: nextDoc,
          capturePersistedDeckPlaybackStateWithFallback: typeof options.capturePersistedDeckPlaybackStateWithFallback,
          capturePersistedDeckPlaybackState: typeof options.capturePersistedDeckPlaybackState,
          ensurePersistedDeckPlaybackStateActiveSlideId: typeof options.ensurePersistedDeckPlaybackStateActiveSlideId,
          getSlides: typeof options.getSlides,
          slideIdAttr: options.slideIdAttr,
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId()
        });
      },
      captureStudioPersistedDeckPlaybackState() {
        throw new Error('playback-state capture should be delegated through the shared capturer builder');
      }
    },
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackStateWithFallback() {},
      capturePersistedDeckPlaybackState() {},
      ensurePersistedDeckPlaybackStateActiveSlideId() {}
    },
    resolveEditorFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return 'slide-1';
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when a canonical deck was provided');
    },
    getSlides() {
      return [];
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState(iframeDoc, canonicalDeck))),
    {
      doc: {
        label: 'iframe-doc'
      },
      capturePersistedDeckPlaybackStateWithFallback: 'function',
      capturePersistedDeckPlaybackState: 'function',
      ensurePersistedDeckPlaybackStateActiveSlideId: 'function',
      getSlides: 'function',
      slideIdAttr: 'data-slide-id',
      fallbackActiveSlideId: 'slide-1'
    }
  );
  assert.equal(delegatedArgs.capturePlaybackState, context.SlideNextStudioEditorPersistence.captureStudioPersistedDeckPlaybackState);
  assert.equal(delegatedArgs.capturePersistedDeckPlaybackStateWithFallback, context.SlideNextDeckPersistence.capturePersistedDeckPlaybackStateWithFallback);
  assert.equal(delegatedArgs.capturePersistedDeckPlaybackState, context.SlideNextDeckPersistence.capturePersistedDeckPlaybackState);
  assert.equal(delegatedArgs.ensurePersistedDeckPlaybackStateActiveSlideId, context.SlideNextDeckPersistence.ensurePersistedDeckPlaybackStateActiveSlideId);
  assert.equal(delegatedArgs.getSlides, context.getSlides);
  assert.equal(delegatedArgs.slideIdAttr, 'data-slide-id');
});

test('capturePersistedDeckPlaybackState delegates through the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 5'
  };
  let delegatedArgs = null;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState() {},
      capturePersistedDeckPlaybackStateWithFallback() {},
      ensurePersistedDeckPlaybackStateActiveSlideId() {}
    },
    SlideNextStudioEditorPersistence: {
      captureStudioPersistedDeckPlaybackState(doc, options = {}) {
        delegatedArgs = {
          doc,
          options
        };
        return playbackState;
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when the shared helper handles playback capture');
    },
    resolveEditorFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return 'slide-2';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState(iframeDoc, canonicalDeck))),
    playbackState
  );
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.capturePersistedDeckPlaybackStateWithFallback, context.SlideNextDeckPersistence.capturePersistedDeckPlaybackStateWithFallback);
  assert.equal(delegatedArgs.options.capturePersistedDeckPlaybackState, context.SlideNextDeckPersistence.capturePersistedDeckPlaybackState);
  assert.equal(delegatedArgs.options.ensurePersistedDeckPlaybackStateActiveSlideId, context.SlideNextDeckPersistence.ensurePersistedDeckPlaybackStateActiveSlideId);
  assert.equal(delegatedArgs.options.getSlides, context.getSlides);
  assert.equal(delegatedArgs.options.slideIdAttr, 'data-slide-id');
  assert.equal(typeof delegatedArgs.options.resolveFallbackActiveSlideId, 'function');
});

test('capturePersistedDeckPlaybackState falls back to the current session slide when shared playback capture has no active slide ids', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return {
          activeSlideIds: [],
          slideCounterText: '2 / 5'
        };
      }
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState())),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reports the resolved live canonical deck when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let reportedCanonicalDeck = null;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return '<html>persisted-live</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      }
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reports canonical deck and playback state for live iframe persistence', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-3']
  };
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return '<html>persisted-live</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      },
      onPlaybackStateResolved(nextPlaybackState) {
        reportedPlaybackState = nextPlaybackState;
      }
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
});

test('buildPersistableDeckHtml renders canonical deck html when the editor frame and persisted baseline are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  let sharedBuildCalls = 0;
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck() {
        throw new Error('persisted canonical deck comparison should not run without a persisted html baseline');
      }
    },
    SlideNextStudioDeckView: {
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    buildEditorSourceDeckHtml(nextDoc, options = {}) {
      calls.push(['buildEditorSourceDeckHtml', nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      assert.equal(sourceViewOptions.buildFallbackHtml(), '');
      return context.SlideNextStudioDeckView.buildStudioSourceHtml(nextDoc, sourceViewOptions);
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), canonicalDeck);
      assert.equal(options.buildFallbackHtml(), '');
      return {
        buildCanonicalDeck() {
          return canonicalDeck;
        },
        buildFallbackHtml() {
          return '';
        },
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: 'slide-1',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 2), ['buildEditorSourceDeckHtml', null]);
  assert.equal(typeof calls[0][2].buildViewOptions, 'function');
  const delegatedSourceViewOptions = calls[0][2].buildViewOptions(null);
  assert.equal(typeof delegatedSourceViewOptions.buildCanonicalDeck, 'function');
  assert.equal(delegatedSourceViewOptions.buildCanonicalDeck(null), canonicalDeck);
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.activeSlideId, 'slide-1');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(calls[1][0], null);
  assert.equal(typeof calls[1][1].buildCanonicalDeck, 'function');
  assert.equal(calls[1][1].buildCanonicalDeck(null), canonicalDeck);
  assert.equal(calls[1][1].buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml reuses the local deck view build options helper when rendering canonical source without a persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const sourceViewOptions = {
    buildCanonicalDeck() {
      return canonicalDeck;
    }
  };
  let delegatedArgs = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('live deck sanitizer should not run without a live frame');
      }
    },
    __createEditorDeckViewBuildOptions(nextDoc, options) {
      delegatedArgs = { nextDoc, options };
      return sourceViewOptions;
    },
    __buildEditorSourceDeckHtml(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(typeof options.buildViewOptions, 'function');
      assert.equal(options.buildViewOptions(nextDoc), sourceViewOptions);
      return '<html>canonical-source</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('createEditorDeckViewBuildOptions = __createEditorDeckViewBuildOptions;', context);
  vm.runInContext('buildEditorSourceDeckHtml = __buildEditorSourceDeckHtml;', context);

  const result = context.buildPersistableDeckHtml();

  assert.equal(result, '<html>canonical-source</html>');
  assert.equal(delegatedArgs.nextDoc, null);
  assert.equal(delegatedArgs.options.buildCanonicalDeck(), canonicalDeck);
  assert.equal(delegatedArgs.options.buildFallbackHtml(), '');
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      delegatedArgs.options.buildRenderOptions(null, canonicalDeck, { activeSlideId: 'slide-2' })
    )),
    {
      activeSlideId: 'slide-2',
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false
    }
  );
});

test('buildPersistableDeckHtml reuses buildEditorSourceDeckHtml when rendering canonical source without a persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const buildEditorSourceDeckHtmlCalls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('live deck sanitizer should not run without a live frame');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), canonicalDeck);
      assert.equal(options.buildFallbackHtml(), '');
      return {
        buildCanonicalDeck() {
          return canonicalDeck;
        }
      };
    },
    buildEditorSourceDeckHtml(nextDoc, options) {
      buildEditorSourceDeckHtmlCalls.push([nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      assert.equal(typeof sourceViewOptions.buildFallbackHtml, 'function');
      assert.equal(sourceViewOptions.buildFallbackHtml(), '');
      return '<html>canonical-source</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(buildEditorSourceDeckHtmlCalls.length, 1);
  assert.equal(buildEditorSourceDeckHtmlCalls[0][0], null);
  assert.equal(typeof buildEditorSourceDeckHtmlCalls[0][1].buildViewOptions, 'function');
  const delegatedSourceViewOptions = buildEditorSourceDeckHtmlCalls[0][1].buildViewOptions(null);
  assert.equal(typeof delegatedSourceViewOptions.buildFallbackHtml, 'function');
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml reuses the local persistable source deck html renderer when rendering canonical source without a persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('live deck sanitizer should not run without a live frame');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      return {
        buildCanonicalDeck: options.buildCanonicalDeck
      };
    },
    __buildEditorSourceDeckHtml(nextDoc, options = {}) {
      calls.push(['buildEditorSourceDeckHtml', nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      return '<html>canonical-source</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('buildEditorSourceDeckHtml = __buildEditorSourceDeckHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(calls[0][0], 'buildEditorSourceDeckHtml');
  assert.equal(calls[0][1], null);
  const delegatedSourceViewOptions = calls[0][2].buildViewOptions(null);
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml prefers rendered canonical html when the current canonical deck differs from the persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-persisted', nodes: [] }]
  };
  const currentCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-current', nodes: [] },
      { id: 'slide-next', nodes: [] }
    ]
  };
  let sharedBuildCalls = 0;
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, nextPersistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, currentCanonicalDeck);
        assert.equal(nextPersistedCanonicalDeck, persistedCanonicalDeck);
        return false;
      }
    },
    SlideNextStudioDeckView: {
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    buildEditorSourceDeckHtml(nextDoc, options = {}) {
      calls.push(['buildEditorSourceDeckHtml', nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), currentCanonicalDeck);
      assert.equal(sourceViewOptions.buildFallbackHtml(), '<html>persisted-baseline</html>');
      return context.SlideNextStudioDeckView.buildStudioSourceHtml(nextDoc, sourceViewOptions);
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), currentCanonicalDeck);
      assert.equal(options.buildFallbackHtml(), '<html>persisted-baseline</html>');
      return {
        buildCanonicalDeck() {
          return currentCanonicalDeck;
        },
        buildFallbackHtml() {
          return '<html>persisted-baseline</html>';
        },
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: 'slide-next',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return currentCanonicalDeck;
    },
    currentSlideIndex: 1,
    getPersistedActiveSlideId() {
      return 'slide-current';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-current']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 2), ['buildEditorSourceDeckHtml', null]);
  const delegatedSourceViewOptions = calls[0][2].buildViewOptions(null);
  assert.equal(delegatedSourceViewOptions.buildCanonicalDeck(), currentCanonicalDeck);
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '<html>persisted-baseline</html>');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.activeSlideId, 'slide-next');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(calls[1][0], null);
  assert.equal(calls[1][1].buildCanonicalDeck(), currentCanonicalDeck);
});
