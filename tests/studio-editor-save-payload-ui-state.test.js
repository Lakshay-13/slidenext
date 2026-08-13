const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorPersistenceState = require('../shared/studio-editor-persistence-state.js');
const persistedHtmlAction = require('../shared/studio-editor-persisted-html-action.js');
const metadataPersistenceAction = require('../shared/studio-editor-metadata-persistence-action.js');
const sanitizerAction = require('../shared/studio-editor-persistable-deck-sanitizer-action.js');
const reusablePersistedHtmlSanitizerAction = require('../shared/studio-editor-reusable-persisted-html-sanitizer-action.js');
const playbackStateAction = require('../shared/studio-editor-persisted-deck-playback-state-action.js');
const buildStateAction = require('../shared/studio-editor-persistable-deck-build-state-action.js');
const capturedStateAction = require('../shared/studio-editor-captured-persistable-deck-state-action.js');
const persistableDeckStateAction = require('../shared/studio-editor-persistable-deck-state-action.js');
const persistableDeckHtmlAction = require('../shared/studio-editor-persistable-deck-html-action.js');
const saveRequestBodyAction = require('../shared/studio-editor-save-request-body-action.js');
const persistedHtmlCheckerAction = require('../shared/studio-editor-persisted-html-checker-action.js');
const persistedSaveRequestCheckerAction = require('../shared/studio-editor-persisted-save-request-checker-action.js');
const deckView = require('../shared/studio-deck-view.js');
const persistedStateFixture = require('./helpers/studio-persisted-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = persistedStateFixture.extractPersistedStateAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function installSlideIndexAccessor(context) {
  context.getStudioCurrentSlideIndex = () => context.currentSlideIndex;
}

function createEditorDeckViewSharedOptionsForTest(context, doc) {
  return deckView.createStudioDeckViewSharedOptions(doc, {
    currentSlideIndex: context.currentSlideIndex,
    getPersistedActiveSlideId: () => typeof context.getPersistedActiveSlideId === 'function'
      ? context.getPersistedActiveSlideId()
      : '',
    buildCanonicalDeck: (nextDoc) => typeof context.buildEditorCanonicalDeck === 'function'
      ? context.buildEditorCanonicalDeck(nextDoc)
      : null,
    resolveCanonicalDeckOverride: (nextCanonicalDeck) => nextCanonicalDeck,
    resolveLiveActiveSlideId: (nextDoc) => typeof context.getActiveSlideId === 'function'
      ? context.getActiveSlideId(nextDoc)
      : '',
    isCanonicalDeck: (deck) => !!deck && Array.isArray(deck.slides)
  });
}

function loadResolveEditorReusablePersistedHtml(context) {
  context.resolveEditorReusablePersistedHtml = persistedHtmlAction.createStudioEditorPersistedHtmlAction({
    getPersistenceController: () => context.studioEditorPersistenceController || null,
    persistenceApi: context.SlideNextStudioEditorPersistence || null,
    persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null
  });
}

function loadResolveEditorMetadataPersistenceOptions(context) {
  const deckLoader = context.SlideNextDeckLoader || null;
  const presentationMetadata = context.SlideNextPresentationMetadata || null;
  context.resolveEditorMetadataPersistenceOptions = metadataPersistenceAction.createStudioEditorMetadataPersistenceAction({
    getPersistenceController: () => context.studioEditorPersistenceController || null,
    persistenceApi: context.SlideNextStudioEditorPersistence || null,
    persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
    getCurrentPresentationMetadata: context.getStudioCurrentPresentationMetadata
      || (() => context.currentPresentationMetadata),
    resolveMergedPresentationPersistenceOptions: context.resolveMergedPresentationPersistenceOptions
      || (deckLoader && deckLoader.resolveMergedPresentationPersistenceOptions),
    resolvePresentationPersistenceOptions: context.resolvePresentationPersistenceOptions
      || (deckLoader && deckLoader.resolvePresentationPersistenceOptions),
    mergePresentationPersistenceOptions: context.mergePresentationPersistenceOptions
      || (presentationMetadata && presentationMetadata.mergePresentationPersistenceOptions)
  });
}

function loadBuildEditorPersistableDeckSanitizerOptions(context) {
  context.buildEditorPersistableDeckSanitizerOptions = sanitizerAction.createStudioEditorPersistableDeckSanitizerAction({
    getPersistenceController: () => context.studioEditorPersistenceController || null,
    persistenceApi: context.SlideNextStudioEditorPersistence || null,
    persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
    getDeckSanitizerOptions: typeof context.getEditorDeckSanitizerOptions === 'function'
      ? context.getEditorDeckSanitizerOptions
      : null
  });
}

function loadSanitizeEditorReusablePersistedHtml(context) {
  context.sanitizeEditorReusablePersistedHtml =
    reusablePersistedHtmlSanitizerAction.createStudioEditorReusablePersistedHtmlSanitizerAction({
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      deckPersistenceApi: context.SlideNextDeckPersistence || null,
      getBuildEditorPersistableDeckSanitizerOptions: () =>
        context.buildEditorPersistableDeckSanitizerOptions
        || context.__buildEditorPersistableDeckSanitizerOptions
        || null,
      getDeckSanitizerOptions: typeof context.getEditorDeckSanitizerOptions === 'function'
        ? context.getEditorDeckSanitizerOptions
        : null,
      DOMParser: context.DOMParser || null
  });
}

function loadCapturePersistedDeckPlaybackState(context) {
  context.capturePersistedDeckPlaybackState =
    playbackStateAction.createStudioEditorPersistedDeckPlaybackStateAction({
      getDocument: () => typeof context.getIframeDoc === 'function'
        ? context.getIframeDoc()
        : null,
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      deckPersistenceApi: context.SlideNextDeckPersistence || null,
      getSlides: typeof context.getSlides === 'function' ? context.getSlides : null,
      slideIdAttr: context.EDITOR_SLIDE_ID_ATTR || 'data-slide-id',
      buildCanonicalDeck: (doc) => typeof context.buildEditorCanonicalDeck === 'function'
        ? context.buildEditorCanonicalDeck(doc)
        : null,
      resolveFallbackActiveSlideId: (doc, canonicalDeck) => {
        if (typeof context.resolveEditorFallbackActiveSlideId !== 'function') return '';
        return context.resolveEditorFallbackActiveSlideId(
          doc,
          canonicalDeck || (typeof context.buildEditorCanonicalDeck === 'function'
            ? context.buildEditorCanonicalDeck(doc)
            : null)
        );
      }
  });
}

function loadCaptureEditorPersistableDeckBuildState(context) {
  context.captureEditorPersistableDeckBuildState =
    buildStateAction.createStudioEditorPersistableDeckBuildStateAction({
      getDocument: () => typeof context.getIframeDoc === 'function'
        ? context.getIframeDoc()
        : null,
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      getBuildPersistableDeckHtml: () => context.buildPersistableDeckHtml || null
  });
}

function loadResolveEditorCapturedPersistableDeckState(context) {
  context.resolveEditorCapturedPersistableDeckState =
    capturedStateAction.createStudioEditorCapturedPersistableDeckStateAction({
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null
  });
}

function loadCaptureEditorPersistableDeckState(context) {
  context.captureEditorPersistableDeckState =
    persistableDeckStateAction.createStudioEditorPersistableDeckStateAction({
      getDocument: () => typeof context.getIframeDoc === 'function'
        ? context.getIframeDoc()
        : null,
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      getCaptureBuildState: () => context.captureEditorPersistableDeckBuildState || null,
      getResolveCapturedState: () => context.resolveEditorCapturedPersistableDeckState || null,
      getCapturePlaybackState: () => context.capturePersistedDeckPlaybackState || null,
      resolveCanonicalDeck: (providedCanonicalDeck, doc) => {
        if (typeof context.resolveEditorCanonicalDeckOverride === 'function') {
          return context.resolveEditorCanonicalDeckOverride(providedCanonicalDeck, {
            buildCanonicalDeck: () => typeof context.buildEditorCanonicalDeck === 'function'
              ? context.buildEditorCanonicalDeck(doc)
              : null
          });
        }
        return providedCanonicalDeck
          || (typeof context.buildEditorCanonicalDeck === 'function'
            ? context.buildEditorCanonicalDeck(doc)
            : null);
      }
    });
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
    loadResolveEditorMetadataPersistenceOptions(context);
  }
  if (typeof context.buildEditorPersistableDeckSanitizerOptions !== 'function') {
    loadBuildEditorPersistableDeckSanitizerOptions(context);
  }
  if (typeof context.capturePersistedDeckPlaybackState !== 'function') {
    loadCapturePersistedDeckPlaybackState(context);
  }
  if (typeof context.captureEditorPersistableDeckBuildState !== 'function') {
    loadCaptureEditorPersistableDeckBuildState(context);
  }
  if (typeof context.resolveEditorCapturedPersistableDeckState !== 'function') {
    loadResolveEditorCapturedPersistableDeckState(context);
  }
  if (typeof context.captureEditorPersistableDeckState !== 'function') {
    loadCaptureEditorPersistableDeckState(context);
  }
  if (typeof context.sanitizeEditorReusablePersistedHtml !== 'function') {
    loadSanitizeEditorReusablePersistedHtml(context);
  }
  if (typeof context.resolveEditorReusablePersistedHtml !== 'function') {
    loadResolveEditorReusablePersistedHtml(context);
  }
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  context.buildPersistableDeckHtml = persistableDeckHtmlAction.createStudioEditorPersistableDeckHtmlAction({
    getDocument: () => typeof context.getIframeDoc === 'function'
      ? context.getIframeDoc()
      : null,
    getPersistenceController: () => context.studioEditorPersistenceController || null,
    persistenceApi: context.SlideNextStudioEditorPersistence || null,
    deckPersistenceApi: context.SlideNextDeckPersistence || null,
    getCurrentPersistedDeckState: () => context.getCurrentEditorPersistedDeckState || null,
    getPersistedDeckStateWithContent: () => context.resolveEditorPersistedDeckStateWithContent || null,
    getResolveCanonicalDeckOverride: () => context.resolveEditorCanonicalDeckOverride || null,
    getBuildCanonicalDeck: () => context.buildEditorCanonicalDeck || null,
    getResolveReusablePersistedHtml: () => context.resolveEditorReusablePersistedHtml || null,
    getSanitizeReusablePersistedHtml: () => context.sanitizeEditorReusablePersistedHtml || null,
    getCreateDeckViewBuildOptions: () => context.createEditorDeckViewBuildOptions || null,
    getBuildDeckRenderOptions: () => context.buildEditorDeckRenderOptions || null,
    getBuildSourceDeckHtml: () => context.buildEditorSourceDeckHtml || null,
    getCapturePlaybackState: () => context.capturePersistedDeckPlaybackState || null,
    getBuildSanitizerOptions: () => context.buildEditorPersistableDeckSanitizerOptions || null,
    getResolveMetadataPersistenceOptions: () => context.resolveEditorMetadataPersistenceOptions || null
  });
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
  context.buildEditorSaveRequestBody = saveRequestBodyAction.createStudioEditorSaveRequestBodyAction({
    getDocument: () => typeof context.getIframeDoc === 'function'
      ? context.getIframeDoc()
      : null,
    getPresentationUrl: () => typeof context.getStudioCurrentPresentationUrl === 'function'
      ? context.getStudioCurrentPresentationUrl()
      : context.currentPresentationUrl || '',
    getSessionToken: () => typeof context.getStudioEditorSessionToken === 'function'
      ? context.getStudioEditorSessionToken()
      : context.sessionToken || null,
    getPersistenceController: () => context.studioEditorPersistenceController || null,
    persistenceApi: context.SlideNextStudioEditorPersistence || null,
    persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
    getCapturePersistableDeckState: () => context.captureEditorPersistableDeckState || null,
    getResolveCanonicalDeckOverride: () => context.resolveEditorCanonicalDeckOverride || null,
    getBuildCanonicalDeck: () => context.buildEditorCanonicalDeck || null,
    getResolveLiveCanonicalDeck: () => context.resolveEditorLiveCanonicalDeck || null,
    getBuildPersistableDeckHtml: () => context.buildPersistableDeckHtml || null
  });
}

function loadIsCurrentDeckHtmlPersisted(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.getCurrentEditorPersistedDeckState !== 'function'
    && Object.prototype.hasOwnProperty.call(context, 'lastPersistedDeckHtml')) {
    loadGetCurrentEditorPersistedDeckState(fileContent, context);
  }
  context.isCurrentDeckHtmlPersisted = persistedHtmlCheckerAction
    .createStudioEditorPersistedHtmlCheckerAction({
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      getPersistedDeckState: context.getCurrentEditorPersistedDeckState || (() => ({}))
    });
}

function loadIsCurrentDeckStatePersisted(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.getCurrentEditorPersistedDeckState !== 'function'
    && Object.prototype.hasOwnProperty.call(context, 'lastPersistedDeckHtml')) {
    loadGetCurrentEditorPersistedDeckState(fileContent, context);
  }
  context.isCurrentDeckStatePersisted = persistedSaveRequestCheckerAction
    .createStudioEditorPersistedSaveRequestCheckerAction({
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi: context.SlideNextStudioEditorPersistence || null,
      persistenceStateApi: context.SlideNextStudioEditorPersistenceState || null,
      getPersistedDeckState: context.getCurrentEditorPersistedDeckState || (() => ({}))
    });
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
  let canonicalBuildOptions = null;
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
    buildEditorCanonicalDeck(nextDoc, options) {
      assert.equal(nextDoc, doc);
      canonicalBuildOptions = options;
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
  assert.equal(canonicalBuildOptions, undefined);
});

test('buildEditorSaveRequestBody creates the shared save adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { label: 'iframe-doc' };
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorSaveRequestBodyAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(typeof options.getPresentationUrl, 'function');
        return (nextDoc, cleanHtml, nextOptions) => {
          calls.push([nextDoc, cleanHtml, nextOptions]);
          return { htmlContent: cleanHtml || '<html>captured</html>' };
        };
      }
    },
    currentPresentationUrl: 'presentations/demo/index.html',
    buildEditorCanonicalDeck() {
      return { kind: 'slidenext.deck', slides: [] };
    },
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    },
    captureEditorPersistableDeckState() {
      return { cleanHtml: '<html>captured</html>', canonicalDeck: null };
    }
  };

  vm.createContext(context);
  const source = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );
  loadBuildEditorSaveRequestBody(fileContent, context, source);

  context.buildEditorSaveRequestBody(doc, null, { isAutoSave: true });
  context.buildEditorSaveRequestBody(doc, '<html>provided</html>', { versionLabel: 'Manual' });

  assert.equal(adapterCreateCalls, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], doc);
  assert.equal(typeof calls[0][2].resolveCanonicalDeck, 'function');
  assert.equal(typeof calls[0][2].getLiveCanonicalDeck, 'function');
  assert.equal(typeof calls[0][2].capturePersistableDeckState, 'function');
  assert.equal(calls[1][1], '<html>provided</html>');
});

test('buildEditorSaveRequestBody delegates to the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );
  const doc = { label: 'iframe-doc' };
  const captureSentinel = () => {};
  const resolveSentinel = () => {};
  const htmlSentinel = () => {};
  let delegatedArgs = null;
  const context = {
    studioEditorPersistenceController: {
      buildSaveRequestBody(nextDoc, nextCleanHtml, nextOptions) {
        delegatedArgs = [nextDoc, nextCleanHtml, nextOptions];
        return { delegated: true };
      }
    },
    getIframeDoc() {
      return doc;
    },
    captureEditorPersistableDeckState() {
      throw new Error('captureEditorPersistableDeckState should not run before controller delegation');
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run before controller delegation');
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(doc, '<html>provided</html>', {
      presentationUrl: '/presentations/custom/index.html',
      isAutoSave: true,
      capturePersistableDeckState: captureSentinel,
      resolveCanonicalDeck: resolveSentinel,
      buildPersistableDeckHtml: htmlSentinel
    }),
    { delegated: true }
  );
  assert.equal(delegatedArgs[0], doc);
  assert.equal(delegatedArgs[1], '<html>provided</html>');
  assert.equal(delegatedArgs[2].capturePersistableDeckState, captureSentinel);
  assert.equal(delegatedArgs[2].resolveCanonicalDeck, resolveSentinel);
  assert.equal(typeof delegatedArgs[2].getLiveCanonicalDeck, 'function');
  assert.equal(delegatedArgs[2].buildPersistableDeckHtml, htmlSentinel);
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

test('buildEditorSaveRequestBody fails closed when the shared save builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );
  const doc = { label: 'iframe-doc' };
  const context = {
    SlideNextStudioEditorPersistence: {},
    getStudioCurrentPresentationUrl() {
      return 'presentations/onboarding-presentation/index.html';
    },
    getIframeDoc() {
      return doc;
    },
    resolveEditorCanonicalDeckOverride() {
      return null;
    },
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.equal(
    context.buildEditorSaveRequestBody(doc, '<html>provided</html>'),
    null
  );
  context.SlideNextStudioEditorPersistence.resolveStudioSaveRequestDeckState = () => ({
    cleanHtml: '<html>resolved</html>',
    canonicalDeck: null
  });
  assert.equal(
    context.buildEditorSaveRequestBody(doc, '<html>provided</html>'),
    null
  );
});

test('buildEditorSaveRequestBody delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioSaveRequestBodyBuilder(options = {}) {
        delegatedArgs = options;
        return (nextDoc, nextCleanHtml, nextOptions = {}) => ({
          doc: nextDoc,
          cleanHtml: nextCleanHtml,
          presentationUrl: nextOptions.presentationUrl,
          canonicalDeck: nextOptions.canonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml
        });
      }
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run while the save builder is delegated');
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck) {
      return nextCanonicalDeck;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

  assert.deepEqual(context.buildEditorSaveRequestBody(doc, null, {
    presentationUrl: 'presentations/custom/index.html',
    canonicalDeck
  }), {
    doc,
    cleanHtml: null,
    presentationUrl: 'presentations/custom/index.html',
    canonicalDeck,
    buildPersistableDeckHtml: context.buildPersistableDeckHtml
  });
  assert.equal(delegatedArgs.getPresentationUrl(), context.currentPresentationUrl);
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
});

test('isCurrentDeckHtmlPersisted reuses the shared persisted-html checker when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckHtmlPersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckHtmlPersisted(cleanHtml) {',
    '\n\n    function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {'
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
      createStudioPersistedDeckHtmlChecker(options = {}) {
        delegatedArgs = options;
        return (cleanHtml) => ({
          cleanHtml,
          persistedDeckState: options.readPersistedDeckState(),
          isPersistedDeckHtml: typeof options.isPersistedDeckHtml
        });
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  loadIsCurrentDeckHtmlPersisted(fileContent, context, isCurrentDeckHtmlPersistedSource);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.isCurrentDeckHtmlPersisted('<html></html>'))),
    {
      cleanHtml: '<html></html>',
      persistedDeckState: {
        cleanHtml: '<html></html>',
        canonicalDeck,
        playbackState: null
      },
      isPersistedDeckHtml: 'function'
    }
  );
  assert.equal(delegatedArgs.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
  assert.equal(delegatedArgs.isPersistedDeckHtml, context.SlideNextStudioEditorPersistence.isStudioPersistedDeckHtml);
});

test('isCurrentDeckHtmlPersisted delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckHtmlPersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckHtmlPersisted(cleanHtml) {',
    '\n\n    function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {'
  );

  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckHtmlChecker(options = {}) {
        factoryOptions = options;
        return (cleanHtml) => ({
          cleanHtml,
          persistedDeckState: options.readPersistedDeckState()
        });
      }
    },
    getCurrentEditorPersistedDeckState() {
      return persistedDeckState;
    }
  };

  vm.createContext(context);
  loadIsCurrentDeckHtmlPersisted(fileContent, context, isCurrentDeckHtmlPersistedSource);

  assert.deepEqual(context.isCurrentDeckHtmlPersisted('<html>current</html>'), {
    cleanHtml: '<html>current</html>',
    persistedDeckState
  });
  assert.equal(factoryOptions.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
});

test('isCurrentDeckHtmlPersisted creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckHtmlPersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckHtmlPersisted(cleanHtml) {',
    '\n\n    function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {'
  );
  let persistedDeckState = { cleanHtml: '<html>one</html>' };
  let adapterCreateCalls = 0;
  let checkerCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistedDeckHtmlCheckerAdapter(options) {
        adapterCreateCalls += 1;
        return (cleanHtml) => {
          checkerCalls += 1;
          return cleanHtml === options.readPersistedDeckState().cleanHtml;
        };
      }
    },
    getCurrentEditorPersistedDeckState() {
      return persistedDeckState;
    }
  };

  vm.createContext(context);
  loadIsCurrentDeckHtmlPersisted(fileContent, context, isCurrentDeckHtmlPersistedSource);

  assert.equal(context.isCurrentDeckHtmlPersisted('<html>one</html>'), true);
  persistedDeckState = { cleanHtml: '<html>two</html>' };
  assert.equal(context.isCurrentDeckHtmlPersisted('<html>two</html>'), true);
  assert.equal(adapterCreateCalls, 1);
  assert.equal(checkerCalls, 2);
});

test('isCurrentDeckHtmlPersisted fails closed when all shared persistence checkers are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckHtmlPersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckHtmlPersisted(cleanHtml) {',
    '\n\n    function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {'
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    getCurrentEditorPersistedDeckState() {
      throw new Error('persisted state should not be read without a checker');
    }
  };

  vm.createContext(context);
  loadIsCurrentDeckHtmlPersisted(fileContent, context, isCurrentDeckHtmlPersistedSource);

  assert.equal(
    context.isCurrentDeckHtmlPersisted('<html>current</html>'),
    false
  );
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
  loadIsCurrentDeckStatePersisted(fileContent, context, isCurrentDeckStatePersistedSource);

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

test('isCurrentDeckStatePersisted delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckStatePersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {',
    '\n\n    function createCurrentStudioPersistenceHandlerOptions(options = {}) {'
  );

  const persistedDeckState = { cleanHtml: '<html>persisted</html>', canonicalDeck: null };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedSaveRequestChecker(options = {}) {
        factoryOptions = options;
        return (saveRequestBody, cleanHtml) => ({
          saveRequestBody,
          cleanHtml,
          persistedDeckState: options.readPersistedDeckState()
        });
      }
    },
    getCurrentEditorPersistedDeckState() {
      return persistedDeckState;
    }
  };
  const saveRequestBody = { htmlContent: '<html>current</html>' };

  vm.createContext(context);
  loadIsCurrentDeckStatePersisted(fileContent, context, isCurrentDeckStatePersistedSource);

  assert.deepEqual(context.isCurrentDeckStatePersisted(saveRequestBody), {
    saveRequestBody,
    cleanHtml: '<html>current</html>',
    persistedDeckState
  });
  assert.equal(factoryOptions.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
});

test('isCurrentDeckStatePersisted creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckStatePersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {',
    '\n\n    function createCurrentStudioPersistenceHandlerOptions(options = {}) {'
  );
  let persistedDeckState = { cleanHtml: '<html>one</html>' };
  let adapterCreateCalls = 0;
  let checkerCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistedSaveRequestCheckerAdapter(options) {
        adapterCreateCalls += 1;
        return (saveRequestBody, cleanHtml) => {
          checkerCalls += 1;
          return cleanHtml === options.readPersistedDeckState().cleanHtml
            && saveRequestBody.id === checkerCalls;
        };
      }
    },
    getCurrentEditorPersistedDeckState() {
      return persistedDeckState;
    }
  };

  vm.createContext(context);
  loadIsCurrentDeckStatePersisted(fileContent, context, isCurrentDeckStatePersistedSource);

  assert.equal(
    context.isCurrentDeckStatePersisted({ id: 1, htmlContent: '<html>one</html>' }),
    true
  );
  persistedDeckState = { cleanHtml: '<html>two</html>' };
  assert.equal(
    context.isCurrentDeckStatePersisted({ id: 2, htmlContent: '<html>two</html>' }),
    true
  );
  assert.equal(adapterCreateCalls, 1);
  assert.equal(checkerCalls, 2);
});

test('isCurrentDeckStatePersisted fails closed when all shared save-request checkers are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentDeckStatePersistedSource = extractFunctionSource(
    fileContent,
    'function isCurrentDeckStatePersisted(saveRequestBody, cleanHtml = saveRequestBody && saveRequestBody.htmlContent) {',
    '\n\n    function createCurrentStudioPersistenceHandlerOptions(options = {}) {'
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    getCurrentEditorPersistedDeckState() {
      throw new Error('persisted state should not be read without a save-request checker');
    }
  };

  vm.createContext(context);
  loadIsCurrentDeckStatePersisted(fileContent, context, isCurrentDeckStatePersistedSource);

  assert.equal(
    context.isCurrentDeckStatePersisted({ htmlContent: '<html>current</html>' }),
    false
  );
});

test('createCurrentStudioPersistenceHandlerOptions reuses the shared handler-options builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createCurrentStudioPersistenceHandlerOptionsSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function applyCurrentStudioPersistenceFailure('
  );

  let delegatedArgs = null;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    createCurrentStudioSessionReaderOptions() {},
    applyCurrentStudioPersistedDeckState() {},
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceHandlerOptionsBuilder(options = {}) {
        delegatedArgs = options;
        return (nextOptions = {}) => ({
          presentationUrl: typeof nextOptions.presentationUrl === 'string' && nextOptions.presentationUrl
            ? nextOptions.presentationUrl
            : options.getPresentationUrl(),
          createSessionReaderOptions: typeof options.createSessionReaderOptions,
          applyPersistedDeckState: typeof options.applyPersistedDeckState,
          onSuccess: nextOptions.onSuccess,
          onFailure: nextOptions.onFailure
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(createCurrentStudioPersistenceHandlerOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createCurrentStudioPersistenceHandlerOptions({
      presentationUrl: 'presentations/custom/index.html',
      onSuccess: 'success-sentinel',
      onFailure: 'failure-sentinel'
    }))),
    {
      presentationUrl: 'presentations/custom/index.html',
      createSessionReaderOptions: 'function',
      applyPersistedDeckState: 'function',
      onSuccess: 'success-sentinel',
      onFailure: 'failure-sentinel'
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), 'presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.createSessionReaderOptions, context.createCurrentStudioSessionReaderOptions);
  assert.equal(delegatedArgs.applyPersistedDeckState, context.applyCurrentStudioPersistedDeckState);
});

test('createCurrentStudioPersistenceHandlerOptions delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createCurrentStudioPersistenceHandlerOptionsSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function applyCurrentStudioPersistenceFailure('
  );
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceHandlerOptionsBuilder(options = {}) {
        return (nextOptions = {}) => ({
          presentationUrl: nextOptions.presentationUrl || options.getPresentationUrl(),
          createSessionReaderOptions: options.createSessionReaderOptions,
          applyPersistedDeckState: options.applyPersistedDeckState,
          onSuccess: nextOptions.onSuccess,
          onFailure: nextOptions.onFailure
        });
      }
    },
    createCurrentStudioSessionReaderOptions() {},
    applyCurrentStudioPersistedDeckState() {}
  };

  vm.createContext(context);
  vm.runInContext(createCurrentStudioPersistenceHandlerOptionsSource, context);

  const result = context.createCurrentStudioPersistenceHandlerOptions({
    presentationUrl: 'presentations/custom/index.html',
    onSuccess: 'success-sentinel',
    onFailure: 'failure-sentinel'
  });
  assert.equal(result.presentationUrl, 'presentations/custom/index.html');
  assert.equal(result.createSessionReaderOptions, context.createCurrentStudioSessionReaderOptions);
  assert.equal(result.applyPersistedDeckState, context.applyCurrentStudioPersistedDeckState);
  assert.equal(result.onSuccess, 'success-sentinel');
  assert.equal(result.onFailure, 'failure-sentinel');
});

test('createCurrentStudioPersistenceHandlerOptions creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createCurrentStudioPersistenceHandlerOptionsSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function applyCurrentStudioPersistenceFailure('
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceHandlerOptionsAdapter(options) {
        adapterCreateCalls += 1;
        return (nextOptions) => {
          calls.push(nextOptions);
          return { presentationUrl: nextOptions.presentationUrl || options.getPresentationUrl() };
        };
      }
    },
    createCurrentStudioSessionReaderOptions() {},
    applyCurrentStudioPersistedDeckState() {}
  };

  vm.createContext(context);
  vm.runInContext(createCurrentStudioPersistenceHandlerOptionsSource, context);

  assert.deepEqual(
    context.createCurrentStudioPersistenceHandlerOptions({ presentationUrl: 'presentations/one/index.html' }),
    { presentationUrl: 'presentations/one/index.html' }
  );
  assert.deepEqual(
    context.createCurrentStudioPersistenceHandlerOptions({ presentationUrl: 'presentations/two/index.html' }),
    { presentationUrl: 'presentations/two/index.html' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map((options) => options.presentationUrl), [
    'presentations/one/index.html',
    'presentations/two/index.html'
  ]);
});

test('resolveCurrentStudioPersistenceStateFromCapture reuses the shared capture-state resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveCurrentStudioPersistenceStateFromCaptureSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {'
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

test('resolveCurrentStudioPersistenceStateFromCapture delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveCurrentStudioPersistenceStateFromCaptureSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceStateFromDocumentCaptureResolver(options = {}) {
        return (nextDoc, nextOptions = {}) => ({
          doc: nextDoc,
          presentationUrl: nextOptions.presentationUrl || options.getPresentationUrl(),
          capturedBy: options.capturePersistableDeckState,
          resolvePersistenceStateFromCapture: nextOptions.resolvePersistenceStateFromCapture
        });
      },
      resolveStudioPersistenceStateFromDocumentCapture() {
        throw new Error('direct capture-state resolution should not run when the adapter builder exists');
      }
    },
    captureEditorPersistableDeckState() {},
    getIframeDoc() {
      return doc;
    }
  };
  const resolvePersistenceStateFromCapture = () => {};

  vm.createContext(context);
  vm.runInContext(resolveCurrentStudioPersistenceStateFromCaptureSource, context);

  const result = context.resolveCurrentStudioPersistenceStateFromCapture(doc, {
    presentationUrl: 'presentations/custom/index.html',
    resolvePersistenceStateFromCapture
  });
  assert.equal(result.doc, doc);
  assert.equal(result.presentationUrl, 'presentations/custom/index.html');
  assert.equal(result.capturedBy, context.captureEditorPersistableDeckState);
  assert.equal(result.resolvePersistenceStateFromCapture, resolvePersistenceStateFromCapture);
});

test('resolveCurrentStudioPersistenceStateFromCapture creates the shared capture-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveCurrentStudioPersistenceStateFromCaptureSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {'
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter(options) {
        adapterCreateCalls += 1;
        return (doc, nextOptions) => {
          calls.push([doc, nextOptions]);
          return { docId: doc.id, presentationUrl: nextOptions.presentationUrl };
        };
      }
    },
    captureEditorPersistableDeckState() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveCurrentStudioPersistenceStateFromCaptureSource, context);

  assert.deepEqual(
    context.resolveCurrentStudioPersistenceStateFromCapture({ id: 'one' }, { presentationUrl: 'presentations/one/index.html' }),
    { docId: 'one', presentationUrl: 'presentations/one/index.html' }
  );
  assert.deepEqual(
    context.resolveCurrentStudioPersistenceStateFromCapture({ id: 'two' }, { presentationUrl: 'presentations/two/index.html' }),
    { docId: 'two', presentationUrl: 'presentations/two/index.html' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([doc]) => doc.id), ['one', 'two']);
});

test('resolveCurrentStudioPersistenceStateFromCapture fails closed when the shared resolver is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveCurrentStudioPersistenceStateFromCaptureSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {'
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    getStudioCurrentPresentationUrl() {
      throw new Error('current presentation should not be read without a shared capture resolver');
    },
    captureEditorPersistableDeckState() {
      throw new Error('persistable state should not be captured without a shared capture resolver');
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveCurrentStudioPersistenceStateFromCaptureSource, context);

  assert.equal(
    context.resolveCurrentStudioPersistenceStateFromCapture({ id: 'capture' }, {
      resolvePersistenceStateFromCapture() {}
    }),
    null
  );
});

test('isCurrentStudioPersistenceTaskStale reuses the shared stale-task checker when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentStudioPersistenceTaskStaleSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceTaskStale(',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceTaskStaleChecker(options = {}) {
        delegatedArgs = options;
        return (presentationUrl, sessionToken) => ({
          presentationUrl,
          sessionToken,
          currentPresentationUrl: options.getPresentationUrl(),
          currentSessionToken: options.getSessionToken(),
          isPersistenceTaskStale: typeof options.isPersistenceTaskStale
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(isCurrentStudioPersistenceTaskStaleSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.isCurrentStudioPersistenceTaskStale(
      'presentations/custom/index.html',
      15
    ))),
    {
      presentationUrl: 'presentations/custom/index.html',
      sessionToken: 15,
      currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
      currentSessionToken: 12,
      isPersistenceTaskStale: 'function'
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), 'presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.getSessionToken(), 12);
  assert.equal(delegatedArgs.isPersistenceTaskStale, context.SlideNextStudioEditorPersistence.isStudioPersistenceTaskStale);
});

test('isCurrentStudioPersistenceTaskStale delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentStudioPersistenceTaskStaleSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceTaskStale(',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );

  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceTaskStaleChecker(options = {}) {
        return (presentationUrl, sessionToken) => ({
          presentationUrl,
          sessionToken,
          currentPresentationUrl: options.getPresentationUrl(),
          currentSessionToken: options.getSessionToken()
        });
      },
      isStudioPersistenceTaskStale() {
        throw new Error('direct stale checking should not run when the adapter builder exists');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(isCurrentStudioPersistenceTaskStaleSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.isCurrentStudioPersistenceTaskStale(
      'presentations/custom/index.html',
      15
    ))),
    {
      presentationUrl: 'presentations/custom/index.html',
      sessionToken: 15,
      currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
      currentSessionToken: 12
    }
  );
});

test('isCurrentStudioPersistenceTaskStale creates the shared stale-task adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentStudioPersistenceTaskStaleSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceTaskStale(',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceTaskStaleCheckerAdapter(options) {
        adapterCreateCalls += 1;
        return (presentationUrl, sessionToken) => {
          calls.push([presentationUrl, sessionToken]);
          return { presentationUrl, sessionToken };
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(isCurrentStudioPersistenceTaskStaleSource, context);

  assert.deepEqual(
    context.isCurrentStudioPersistenceTaskStale('presentations/one/index.html', 1),
    { presentationUrl: 'presentations/one/index.html', sessionToken: 1 }
  );
  assert.deepEqual(
    context.isCurrentStudioPersistenceTaskStale('presentations/two/index.html', 2),
    { presentationUrl: 'presentations/two/index.html', sessionToken: 2 }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls, [
    ['presentations/one/index.html', 1],
    ['presentations/two/index.html', 2]
  ]);
});

test('isCurrentStudioPersistenceTaskStale fails closed when the shared checker is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const isCurrentStudioPersistenceTaskStaleSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceTaskStale(',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    getStudioCurrentPresentationUrl() {
      throw new Error('current presentation should not be read without a stale checker');
    },
    getStudioEditorSessionToken() {
      throw new Error('current session should not be read without a stale checker');
    }
  };

  vm.createContext(context);
  vm.runInContext(isCurrentStudioPersistenceTaskStaleSource, context);

  assert.equal(
    context.isCurrentStudioPersistenceTaskStale('presentations/deck/index.html', 12),
    true
  );
});

test('runCurrentStudioPersistenceActionIfCurrent reuses the shared current-action runner when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runCurrentStudioPersistenceActionIfCurrentSource = extractFunctionSource(
    fileContent,
    'function runCurrentStudioPersistenceActionIfCurrent(',
    '\n\n    function isCurrentStudioPersistenceTaskStale('
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => 'presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 12
      };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceActionCurrentRunner(options = {}) {
        delegatedArgs = options;
        return (persistenceContext, action) => {
          const sessionState = options.readCurrentSessionState();
          return {
            persistenceContext,
            action,
            currentPresentationUrl: sessionState.getCurrentPresentationUrl(),
            currentSessionToken: sessionState.getCurrentSessionToken(),
            runPersistenceActionIfCurrent: typeof options.runPersistenceActionIfCurrent
          };
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(runCurrentStudioPersistenceActionIfCurrentSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.runCurrentStudioPersistenceActionIfCurrent(
      {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      'callback-sentinel'
    ))),
    {
      persistenceContext: {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      action: 'callback-sentinel',
      currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
      currentSessionToken: 12,
      runPersistenceActionIfCurrent: 'function'
    }
  );
  assert.equal(delegatedArgs.readCurrentSessionState, context.createCurrentStudioSessionStateReaders);
  assert.equal(
    delegatedArgs.runPersistenceActionIfCurrent,
    context.SlideNextStudioEditorPersistence.runStudioPersistenceActionIfCurrent
  );
});

test('runCurrentStudioPersistenceActionIfCurrent delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runCurrentStudioPersistenceActionIfCurrentSource = extractFunctionSource(
    fileContent,
    'function runCurrentStudioPersistenceActionIfCurrent(',
    '\n\n    function isCurrentStudioPersistenceTaskStale('
  );
  const persistenceContext = { presentationUrl: 'presentations/deck/index.html' };
  const action = 'action-sentinel';
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceActionCurrentRunner(options = {}) {
        return (nextPersistenceContext, nextAction) => ({
          persistenceContext: nextPersistenceContext,
          action: nextAction,
          currentSessionState: options.readCurrentSessionState()
        });
      },
      runStudioPersistenceActionIfCurrent() {
        throw new Error('direct action running should not run when the adapter builder exists');
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => 'presentations/deck/index.html',
        getCurrentSessionToken: () => 12
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(runCurrentStudioPersistenceActionIfCurrentSource, context);

  const result = context.runCurrentStudioPersistenceActionIfCurrent(persistenceContext, action);
  assert.equal(result.persistenceContext, persistenceContext);
  assert.equal(result.action, action);
  assert.equal(result.currentSessionState.getCurrentPresentationUrl(), 'presentations/deck/index.html');
  assert.equal(result.currentSessionState.getCurrentSessionToken(), 12);
});

test('runCurrentStudioPersistenceActionIfCurrent creates the shared current-action adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runCurrentStudioPersistenceActionIfCurrentSource = extractFunctionSource(
    fileContent,
    'function runCurrentStudioPersistenceActionIfCurrent(',
    '\n\n    function isCurrentStudioPersistenceTaskStale('
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceActionCurrentRunnerAdapter(options) {
        adapterCreateCalls += 1;
        return (persistenceContext, action) => {
          calls.push([persistenceContext, action]);
          return { contextId: persistenceContext.id, action };
        };
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(runCurrentStudioPersistenceActionIfCurrentSource, context);

  assert.deepEqual(
    context.runCurrentStudioPersistenceActionIfCurrent({ id: 'one' }, 'action-one'),
    { contextId: 'one', action: 'action-one' }
  );
  assert.deepEqual(
    context.runCurrentStudioPersistenceActionIfCurrent({ id: 'two' }, 'action-two'),
    { contextId: 'two', action: 'action-two' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, action]) => action), ['action-one', 'action-two']);
});

test('runCurrentStudioPersistenceActionIfCurrent fails closed when the shared runner is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runCurrentStudioPersistenceActionIfCurrentSource = extractFunctionSource(
    fileContent,
    'function runCurrentStudioPersistenceActionIfCurrent(',
    '\n\n    function isCurrentStudioPersistenceTaskStale('
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    createCurrentStudioSessionStateReaders() {
      throw new Error('session readers should not be built without a shared persistence runner');
    }
  };

  vm.createContext(context);
  vm.runInContext(runCurrentStudioPersistenceActionIfCurrentSource, context);

  assert.equal(
    context.runCurrentStudioPersistenceActionIfCurrent({ id: 'persistence' }, 'action'),
    false
  );
});

test('applyCurrentStudioPersistenceFailure reuses the shared failure handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceFailureSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceFailure(',
    '\n\n    function applyCurrentStudioPersistenceSuccess('
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        handlerOptions: true,
        onFailure: options.onFailure
      };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceFailureHandler(options = {}) {
        delegatedArgs = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceFailure: typeof options.handlePersistenceFailure
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceFailureSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioPersistenceFailure(
      {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      {
        onFailure: 'callback-sentinel'
      }
    ))),
    {
      persistenceContext: {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      resolvedOptions: {
        handlerOptions: true,
        onFailure: 'callback-sentinel'
      },
      handlePersistenceFailure: 'function'
    }
  );
  assert.equal(delegatedArgs.createHandlerOptions, context.createCurrentStudioPersistenceHandlerOptions);
  assert.equal(
    delegatedArgs.handlePersistenceFailure,
    context.SlideNextStudioEditorPersistence.handleStudioPersistenceFailure
  );
});

test('applyCurrentStudioPersistenceFailure delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceFailureSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceFailure(',
    '\n\n    function applyCurrentStudioPersistenceSuccess('
  );
  const context = {
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        handlerOptions: true,
        onFailure: options.onFailure
      };
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceFailureHandler(options = {}) {
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceFailure: options.handlePersistenceFailure
        });
      },
      handleStudioPersistenceFailure() {
        throw new Error('direct failure handling should not run when the adapter builder exists');
      }
    }
  };
  const persistenceContext = { presentationUrl: 'presentations/deck/index.html' };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceFailureSource, context);

  const result = context.applyCurrentStudioPersistenceFailure(persistenceContext, {
    onFailure: 'callback-sentinel'
  });
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    handlerOptions: true,
    onFailure: 'callback-sentinel'
  });
  assert.equal(result.handlePersistenceFailure, context.SlideNextStudioEditorPersistence.handleStudioPersistenceFailure);
});

test('applyCurrentStudioPersistenceFailure creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceFailureSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceFailure(',
    '\n\n    function applyCurrentStudioPersistenceSuccess('
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceFailureHandlerAdapter(options) {
        adapterCreateCalls += 1;
        return (persistenceContext, nextOptions) => {
          calls.push([persistenceContext, nextOptions]);
          return { id: nextOptions.id, contextId: persistenceContext.id };
        };
      }
    },
    createCurrentStudioPersistenceHandlerOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceFailureSource, context);

  assert.deepEqual(
    context.applyCurrentStudioPersistenceFailure({ id: 'one' }, { id: 1 }),
    { id: 1, contextId: 'one' }
  );
  assert.deepEqual(
    context.applyCurrentStudioPersistenceFailure({ id: 'two' }, { id: 2 }),
    { id: 2, contextId: 'two' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('applyCurrentStudioPersistenceFailure fails closed when the shared failure handler is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceFailureSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceFailure(',
    '\n\n    function applyCurrentStudioPersistenceSuccess('
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    createCurrentStudioPersistenceHandlerOptions() {
      throw new Error('handler options should not be built without a failure handler');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceFailureSource, context);

  assert.equal(
    context.applyCurrentStudioPersistenceFailure({ id: 'failure' }),
    false
  );
});

test('applyCurrentStudioPersistenceSuccess reuses the shared success handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceSuccess(',
    '\n\n    function applyCurrentStudioVersionPersistenceSuccess('
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        handlerOptions: true,
        onSuccess: options.onSuccess
      };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceSuccessHandler(options = {}) {
        delegatedArgs = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceSuccess: typeof options.handlePersistenceSuccess
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceSuccessSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioPersistenceSuccess(
      {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      {
        onSuccess: 'callback-sentinel'
      }
    ))),
    {
      persistenceContext: {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      resolvedOptions: {
        handlerOptions: true,
        onSuccess: 'callback-sentinel'
      },
      handlePersistenceSuccess: 'function'
    }
  );
  assert.equal(delegatedArgs.createHandlerOptions, context.createCurrentStudioPersistenceHandlerOptions);
  assert.equal(
    delegatedArgs.handlePersistenceSuccess,
    context.SlideNextStudioEditorPersistence.handleStudioPersistenceSuccess
  );
});

test('applyCurrentStudioPersistenceSuccess delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceSuccess(',
    '\n\n    function applyCurrentStudioVersionPersistenceSuccess('
  );
  const context = {
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        handlerOptions: true,
        onSuccess: options.onSuccess
      };
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceSuccessHandler(options = {}) {
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceSuccess: options.handlePersistenceSuccess
        });
      },
      handleStudioPersistenceSuccess() {
        throw new Error('direct success handling should not run when the adapter builder exists');
      }
    }
  };
  const persistenceContext = { presentationUrl: 'presentations/deck/index.html' };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceSuccessSource, context);

  const result = context.applyCurrentStudioPersistenceSuccess(persistenceContext, {
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    handlerOptions: true,
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.handlePersistenceSuccess, context.SlideNextStudioEditorPersistence.handleStudioPersistenceSuccess);
});

test('applyCurrentStudioPersistenceSuccess creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceSuccess(',
    '\n\n    function applyCurrentStudioVersionPersistenceSuccess('
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistenceSuccessHandlerAdapter(options) {
        adapterCreateCalls += 1;
        return (persistenceContext, nextOptions) => {
          calls.push([persistenceContext, nextOptions]);
          return { id: nextOptions.id, contextId: persistenceContext.id };
        };
      }
    },
    createCurrentStudioPersistenceHandlerOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceSuccessSource, context);

  assert.deepEqual(
    context.applyCurrentStudioPersistenceSuccess({ id: 'one' }, { id: 1 }),
    { id: 1, contextId: 'one' }
  );
  assert.deepEqual(
    context.applyCurrentStudioPersistenceSuccess({ id: 'two' }, { id: 2 }),
    { id: 2, contextId: 'two' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('applyCurrentStudioPersistenceSuccess fails closed when the shared success handler is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceSuccess(',
    '\n\n    function applyCurrentStudioVersionPersistenceSuccess('
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    createCurrentStudioPersistenceHandlerOptions() {
      throw new Error('handler options should not be built without a success handler');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioPersistenceSuccessSource, context);

  assert.equal(
    context.applyCurrentStudioPersistenceSuccess({ id: 'success' }),
    false
  );
});

test('applyCurrentStudioVersionPersistenceSuccess reuses the shared version-success handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioVersionPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionPersistenceSuccess(',
    '\n\n    function runCurrentStudioPersistenceActionIfCurrent('
  );

  let delegatedArgs = null;
  const context = {
    loadVersions: 'loadVersions-sentinel',
    createCurrentStudioSessionReaderOptions(options = {}) {
      return {
        sessionReaderOptions: true,
        refreshVersionEntries: options.refreshVersionEntries,
        onSuccess: options.onSuccess
      };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioVersionPersistenceSuccessHandler(options = {}) {
        delegatedArgs = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handleVersionPersistenceSuccess: typeof options.handleVersionPersistenceSuccess
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioVersionPersistenceSuccessSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioVersionPersistenceSuccess(
      {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      {
        onSuccess: 'callback-sentinel'
      }
    ))),
    {
      persistenceContext: {
        presentationUrl: 'presentations/custom/index.html',
        sessionToken: 15
      },
      resolvedOptions: {
        sessionReaderOptions: true,
        refreshVersionEntries: 'loadVersions-sentinel',
        onSuccess: 'callback-sentinel'
      },
      handleVersionPersistenceSuccess: 'function'
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.createHandlerOptions({ onSuccess: 'callback-sentinel' }))),
    {
      sessionReaderOptions: true,
      refreshVersionEntries: 'loadVersions-sentinel',
      onSuccess: 'callback-sentinel'
    }
  );
  assert.equal(
    delegatedArgs.handleVersionPersistenceSuccess,
    context.SlideNextStudioEditorPersistence.handleStudioVersionPersistenceSuccess
  );
});

test('applyCurrentStudioVersionPersistenceSuccess delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioVersionPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionPersistenceSuccess(',
    '\n\n    function runCurrentStudioPersistenceActionIfCurrent('
  );
  const context = {
    loadVersions: 'loadVersions-sentinel',
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioVersionPersistenceSuccessHandler(options = {}) {
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handleVersionPersistenceSuccess: options.handleVersionPersistenceSuccess
        });
      },
      handleStudioVersionPersistenceSuccess() {
        throw new Error('direct version success handling should not run when the adapter builder exists');
      }
    },
    createCurrentStudioSessionReaderOptions(options = {}) {
      return {
        sessionReaderOptions: true,
        refreshVersionEntries: options.refreshVersionEntries,
        onSuccess: options.onSuccess
      };
    }
  };
  const persistenceContext = { presentationUrl: 'presentations/deck/index.html' };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioVersionPersistenceSuccessSource, context);

  const result = context.applyCurrentStudioVersionPersistenceSuccess(persistenceContext, {
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    sessionReaderOptions: true,
    refreshVersionEntries: 'loadVersions-sentinel',
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.handleVersionPersistenceSuccess, context.SlideNextStudioEditorPersistence.handleStudioVersionPersistenceSuccess);
});

test('applyCurrentStudioVersionPersistenceSuccess creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioVersionPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionPersistenceSuccess(',
    '\n\n    function runCurrentStudioPersistenceActionIfCurrent('
  );
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    loadVersions: 'load-versions-sentinel',
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorVersionPersistenceSuccessHandlerAdapter(options) {
        adapterCreateCalls += 1;
        return (persistenceContext, nextOptions) => {
          calls.push([persistenceContext, nextOptions]);
          return { id: nextOptions.id, contextId: persistenceContext.id };
        };
      }
    },
    createCurrentStudioSessionReaderOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioVersionPersistenceSuccessSource, context);

  assert.deepEqual(
    context.applyCurrentStudioVersionPersistenceSuccess({ id: 'one' }, { id: 1 }),
    { id: 1, contextId: 'one' }
  );
  assert.deepEqual(
    context.applyCurrentStudioVersionPersistenceSuccess({ id: 'two' }, { id: 2 }),
    { id: 2, contextId: 'two' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('applyCurrentStudioVersionPersistenceSuccess fails closed when the shared version-success handler is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentStudioVersionPersistenceSuccessSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionPersistenceSuccess(',
    '\n\n    function runCurrentStudioPersistenceActionIfCurrent('
  );
  const context = {
    SlideNextStudioEditorPersistence: {},
    createCurrentStudioSessionReaderOptions() {
      throw new Error('version handler options should not be built without a version-success handler');
    },
    loadVersions() {
      throw new Error('versions should not refresh without a version-success handler');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentStudioVersionPersistenceSuccessSource, context);

  assert.equal(
    context.applyCurrentStudioVersionPersistenceSuccess({ id: 'version-success' }),
    false
  );
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

test('resolveEditorPersistedDeckStateWithContent fails closed when the shared resolver factory is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    __resolveWithContent(persistedDeckState) {
      calls.push(persistedDeckState);
      return persistedDeckState;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioEditorPersistence: {}
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext('getCurrentEditorPersistedDeckState.resolveWithContent = __resolveWithContent;', context);

  assert.equal(context.resolveEditorPersistedDeckStateWithContent(), null);
  assert.deepEqual(calls, []);
});

test('resolveEditorPersistedDeckStateWithContent reuses the shared persisted-state content resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  let resolverCreateCalls = 0;
  const context = {
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistedDeckStateContentResolver(options = {}) {
        resolverCreateCalls += 1;
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
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorPersistedDeckStateWithContent({
      cleanHtml: '<html>second</html>',
      canonicalDeck: { id: 'second' },
      playbackState: null
    }))),
    {
      cleanHtml: '<html>second</html>',
      canonicalDeck: { id: 'second' },
      playbackState: null
    }
  );
  assert.equal(resolverCreateCalls, 1);
  assert.equal(delegatedArgs.readPersistedDeckState, context.getCurrentEditorPersistedDeckState);
  assert.equal(delegatedArgs.resolveWithContent, context.getCurrentEditorPersistedDeckState.resolveWithContent);
});

test('resolveEditorCapturedPersistableDeckState fails closed when the shared resolver is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorPersistence: {}
  };

  vm.createContext(context);
  loadResolveEditorCapturedPersistableDeckState(context);

  assert.equal(
    context.resolveEditorCapturedPersistableDeckState('<html>persisted</html>'),
    null
  );
});

test('resolveEditorCapturedPersistableDeckState reuses the shared captured-state resolver builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
  loadResolveEditorCapturedPersistableDeckState(context);

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

test('resolveEditorCapturedPersistableDeckState delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1']
  };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioCapturedPersistableDeckStateResolver(options = {}) {
        factoryOptions = options;
        return (nextCleanHtml, nextOptions = {}) => ({
          cleanHtml: nextCleanHtml,
          canonicalDeck: nextOptions.canonicalDeck,
          playbackState: nextOptions.resolvePlaybackState(nextOptions.canonicalDeck)
        });
      }
    }
  };
  const resolvePlaybackState = (nextCanonicalDeck) => {
    assert.equal(nextCanonicalDeck, canonicalDeck);
    return playbackState;
  };

  vm.createContext(context);
  loadResolveEditorCapturedPersistableDeckState(context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorCapturedPersistableDeckState('<html>persisted</html>', {
      canonicalDeck,
      resolvePlaybackState
    }))),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState: {
        activeSlideIds: ['slide-1']
      }
    }
  );
  assert.equal(typeof factoryOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof factoryOptions.resolvePlaybackState, 'function');
});

test('resolveEditorCapturedPersistableDeckState creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorCapturedPersistableDeckStateResolverAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (cleanHtml, nextOptions) => {
          calls.push([cleanHtml, nextOptions]);
          return { id: nextOptions.id };
        };
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorCapturedPersistableDeckState(context);

  assert.deepEqual(
    context.resolveEditorCapturedPersistableDeckState('<html>one</html>', { id: 1 }),
    { id: 1 }
  );
  assert.deepEqual(
    context.resolveEditorCapturedPersistableDeckState('<html>two</html>', { id: 2 }),
    { id: 2 }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('resolveEditorCapturedPersistableDeckState delegates to the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    studioEditorPersistenceController: {
      resolveCapturedPersistableDeckState(cleanHtml, options) {
        delegatedArgs = { cleanHtml, options };
        return { delegated: true };
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorCapturedPersistableDeckState(context);

  const options = { id: 1 };
  assert.deepEqual(context.resolveEditorCapturedPersistableDeckState('<html>persisted</html>', options), {
    delegated: true
  });
  assert.equal(delegatedArgs.cleanHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.options, options);
});

test('captureEditorPersistableDeckBuildState delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckBuildStateCapturer(options = {}) {
        factoryOptions = options;
        return (doc, nextOptions = {}) => ({
          doc,
          canonicalDeck: nextOptions.canonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml
        });
      }
    },
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckBuildState(context);

  assert.deepEqual(context.captureEditorPersistableDeckBuildState(iframeDoc, {
    canonicalDeck
  }), {
    doc: iframeDoc,
    canonicalDeck,
    buildPersistableDeckHtml: context.buildPersistableDeckHtml
  });
  assert.equal(factoryOptions.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
});

test('captureEditorPersistableDeckBuildState creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistableDeckBuildStateCapturerAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (doc, buildOptions) => {
          calls.push([doc, buildOptions]);
          return { id: buildOptions.id };
        };
      }
    },
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckBuildState(context);

  const iframeDoc = { label: 'iframe-doc' };
  assert.deepEqual(context.captureEditorPersistableDeckBuildState(iframeDoc, { id: 1 }), { id: 1 });
  assert.deepEqual(context.captureEditorPersistableDeckBuildState(iframeDoc, { id: 2 }), { id: 2 });
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('captureEditorPersistableDeckBuildState delegates to the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const buildPersistableDeckHtml = () => '<html>built</html>';
  let delegatedArgs = null;
  const context = {
    studioEditorPersistenceController: {
      capturePersistableDeckBuildState(doc, options) {
        delegatedArgs = { doc, options };
        return { delegated: true };
      }
    },
    buildPersistableDeckHtml
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckBuildState(context);

  const buildOptions = { id: 1 };
  assert.deepEqual(context.captureEditorPersistableDeckBuildState(iframeDoc, buildOptions), { delegated: true });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.id, 1);
  assert.equal(delegatedArgs.options.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
});

test('captureEditorPersistableDeckBuildState reuses the shared build-state capturer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
  loadCaptureEditorPersistableDeckBuildState(context);

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
  loadCaptureEditorPersistableDeckState(context);

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

test('captureEditorPersistableDeckState delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const playbackState = { activeSlideIds: ['slide-1'] };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckStateCapturer(options = {}) {
        factoryOptions = options;
        return (doc, nextOptions = {}) => ({
          doc,
          canonicalDeck: nextOptions.canonicalDeck,
          playbackState: options.resolvePlaybackState(nextOptions.canonicalDeck)
        });
      }
    },
    captureEditorPersistableDeckBuildState() {
      return { cleanHtml: '<html>persisted</html>' };
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck) {
      return nextCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run for an explicit canonical deck');
    },
    capturePersistedDeckPlaybackState(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(context);

  assert.deepEqual(context.captureEditorPersistableDeckState(iframeDoc, {
    canonicalDeck
  }), {
    doc: iframeDoc,
    canonicalDeck,
    playbackState
  });
  assert.equal(factoryOptions.captureBuildState, context.captureEditorPersistableDeckBuildState);
  assert.equal(typeof factoryOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof factoryOptions.resolvePlaybackState, 'function');
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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

test('buildPersistableDeckHtml fails closed when the shared persistence runtime is unavailable', () => {
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: {},
    capturePersistedDeckPlaybackState() {
      return null;
    },
    getIframeDoc() {
      return { id: 'iframe-doc' };
    },
    resolveEditorCanonicalDeckOverride() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '');
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
  loadResolveEditorReusablePersistedHtml(context);

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
  loadResolveEditorReusablePersistedHtml(context);

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

test('resolveEditorReusablePersistedHtml delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const persistedDeckState = {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioReusablePersistedHtmlResolver(options = {}) {
        delegatedArgs = options;
        return (nextPersistedDeckState, nextOptions = {}) => ({
          persistedDeckState: nextPersistedDeckState,
          options: nextOptions
        });
      },
      resolveStudioReusablePersistedHtml() {
        throw new Error('direct reusable-html helper should remain behind the adapter');
      },
      resolveStudioPersistedHtmlReuse() {},
      isStudioPersistedCanonicalDeck() {}
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState
  };

  vm.createContext(context);
  loadResolveEditorReusablePersistedHtml(context);

  const result = context.resolveEditorReusablePersistedHtml(persistedDeckState, {
    canonicalDeck,
    persistedHtml: persistedDeckState.cleanHtml,
    persistedCanonicalDeck: canonicalDeck
  });

  assert.equal(result.persistedDeckState, persistedDeckState);
  assert.equal(result.options.canonicalDeck, canonicalDeck);
  assert.equal(result.options.persistedHtml, persistedDeckState.cleanHtml);
  assert.equal(delegatedArgs.resolveReusablePersistedHtml, context.SlideNextStudioEditorPersistence.resolveStudioReusablePersistedHtml);
  assert.equal(delegatedArgs.resolvePersistedHtmlReuse, context.SlideNextStudioEditorPersistence.resolveStudioPersistedHtmlReuse);
  assert.equal(delegatedArgs.isPersistedCanonicalDeck, context.SlideNextStudioEditorPersistence.isStudioPersistedCanonicalDeck);
});

test('resolveEditorReusablePersistedHtml creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorReusablePersistedHtmlAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (nextPersistedDeckState, nextOptions) => {
          calls.push([nextPersistedDeckState, nextOptions]);
          return nextPersistedDeckState.cleanHtml;
        };
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorReusablePersistedHtml(context);

  assert.equal(context.resolveEditorReusablePersistedHtml(persistedDeckState, { id: 1 }), '<html>persisted</html>');
  assert.equal(context.resolveEditorReusablePersistedHtml(persistedDeckState, { id: 2 }), '<html>persisted</html>');
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('resolveEditorReusablePersistedHtml fails closed when the shared helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {};

  vm.createContext(context);
  loadResolveEditorReusablePersistedHtml(context);

  assert.equal(
    context.resolveEditorReusablePersistedHtml({
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck
    }, {
      canonicalDeck,
      persistedHtml: '<html>persisted-baseline</html>',
      persistedCanonicalDeck: canonicalDeck
    }),
    ''
  );
});

test('resolveEditorMetadataPersistenceOptions delegates through the shared metadata persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

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
  loadResolveEditorMetadataPersistenceOptions(context);

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
  loadResolveEditorMetadataPersistenceOptions(context);

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

test('resolveEditorMetadataPersistenceOptions delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const metadata = { id: 'deck-1' };
  let delegatedOptions = null;
  const context = {
    currentPresentationMetadata: metadata,
    SlideNextStudioEditorPersistence: {
      createStudioMetadataPersistenceOptionsResolver(options = {}) {
        delegatedOptions = options;
        return (nextOptions = {}) => ({
          metadata: options.getCurrentPresentationMetadata(),
          persistenceOptions: nextOptions.persistenceOptions
        });
      },
      resolveStudioMetadataPersistenceOptions() {
        throw new Error('direct metadata helper should remain behind the adapter');
      }
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState
  };

  vm.createContext(context);
  loadResolveEditorMetadataPersistenceOptions(context);

  assert.deepEqual(
    context.resolveEditorMetadataPersistenceOptions({ persistenceOptions: { theme: 'dark' } }),
    {
      metadata,
      persistenceOptions: { theme: 'dark' }
    }
  );
  assert.equal(delegatedOptions.getCurrentPresentationMetadata(), metadata);
  assert.equal(delegatedOptions.resolveMergedPresentationPersistenceOptions, null);
  assert.equal(delegatedOptions.resolvePresentationPersistenceOptions, null);
  assert.equal(delegatedOptions.mergePresentationPersistenceOptions, null);
});

test('resolveEditorMetadataPersistenceOptions creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorMetadataPersistenceOptionsAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (nextOptions) => {
          calls.push(nextOptions);
          return { id: nextOptions.id };
        };
      }
    },
    currentPresentationMetadata: { id: 'deck-1' }
  };

  vm.createContext(context);
  loadResolveEditorMetadataPersistenceOptions(context);

  assert.deepEqual(context.resolveEditorMetadataPersistenceOptions({ id: 1 }), { id: 1 });
  assert.deepEqual(context.resolveEditorMetadataPersistenceOptions({ id: 2 }), { id: 2 });
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map((options) => options.id), [1, 2]);
});

test('resolveEditorMetadataPersistenceOptions delegates to the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedOptions = null;
  const context = {
    studioEditorPersistenceController: {
      resolveMetadataPersistenceOptions(options) {
        delegatedOptions = options;
        return { delegated: true };
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorMetadataPersistenceOptions(context);

  const options = { persistenceOptions: { transientClassNames: ['revealed'] } };
  assert.deepEqual(context.resolveEditorMetadataPersistenceOptions(options), { delegated: true });
  assert.equal(delegatedOptions, options);
});

test('resolveEditorMetadataPersistenceOptions prefers the shared merged persistence resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioMetadataPersistenceOptions: editorPersistence.resolveStudioMetadataPersistenceOptions
    },
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
  loadResolveEditorMetadataPersistenceOptions(context);

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

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioMetadataPersistenceOptions: editorPersistence.resolveStudioMetadataPersistenceOptions
    },
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
  loadResolveEditorMetadataPersistenceOptions(context);

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

test('resolveEditorMetadataPersistenceOptions fails closed when the shared helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const context = {
    currentPresentationMetadata: {
      persistence: {
        emptyContainerIds: ['pixelMatrix']
      }
    },
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions() {
        throw new Error('page-local persistence fallback should not run');
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorMetadataPersistenceOptions(context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions({
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }))),
    {}
  );
});

test('buildEditorPersistableDeckSanitizerOptions composes metadata cleanup, chrome filters, and playback state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const calls = [];
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence
  };

  vm.createContext(context);
  loadBuildEditorPersistableDeckSanitizerOptions(context);

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

test('buildEditorPersistableDeckSanitizerOptions fails closed when the shared helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    getEditorDeckSanitizerOptions() {
      throw new Error('page-local sanitizer fallback should not run');
    }
  };

  vm.createContext(context);
  loadBuildEditorPersistableDeckSanitizerOptions(context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions({
      activeSlideIds: ['slide-2']
    }))),
    {}
  );
});

test('buildEditorPersistableDeckSanitizerOptions delegates through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

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
  loadBuildEditorPersistableDeckSanitizerOptions(context);

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
  loadBuildEditorPersistableDeckSanitizerOptions(context);

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

test('buildEditorPersistableDeckSanitizerOptions delegates to the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const playbackState = { activeSlideIds: ['slide-2'] };
  const resolveMetadataPersistenceOptions = () => ({ emptyContainerIds: ['pixelMatrix'] });
  const getDeckSanitizerOptions = () => ({ chromeNodeIds: ['editorSelectionOverlay'] });
  let delegatedArgs = null;
  const context = {
    studioEditorPersistenceController: {
      buildPersistableDeckSanitizerOptions(nextPlaybackState, options) {
        delegatedArgs = { nextPlaybackState, options };
        return { delegated: true };
      }
    }
  };

  vm.createContext(context);
  loadBuildEditorPersistableDeckSanitizerOptions(context);

  assert.deepEqual(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  }), { delegated: true });
  assert.equal(delegatedArgs.nextPlaybackState, playbackState);
  assert.equal(delegatedArgs.options.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedArgs.options.getDeckSanitizerOptions, getDeckSanitizerOptions);
});

test('buildEditorPersistableDeckSanitizerOptions delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let factoryOptions = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistableDeckSanitizerOptionsBuilder(options = {}) {
        factoryOptions = options;
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
    }
  };

  vm.createContext(context);
  loadBuildEditorPersistableDeckSanitizerOptions(context);

  const resolveMetadataPersistenceOptions = () => ({ emptyContainerIds: ['pixelMatrix'] });
  const getDeckSanitizerOptions = () => ({ chromeNodeIds: ['editorSelectionOverlay'] });
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
      resolveMetadataPersistenceOptions,
      getDeckSanitizerOptions
    }))),
    {
      playbackState: {
        activeSlideIds: ['slide-2']
      },
      metadataOptions: {
        emptyContainerIds: ['pixelMatrix']
      },
      deckSanitizerOptions: {
        chromeNodeIds: ['editorSelectionOverlay']
      }
    }
  );
  assert.equal(factoryOptions.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(factoryOptions.getDeckSanitizerOptions, getDeckSanitizerOptions);
});

test('buildEditorPersistableDeckSanitizerOptions creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistableDeckSanitizerOptionsAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (nextPlaybackState, nextOptions) => {
          calls.push([nextPlaybackState, nextOptions]);
          return { playbackState: nextPlaybackState };
        };
      }
    }
  };

  vm.createContext(context);
  loadBuildEditorPersistableDeckSanitizerOptions(context);

  const firstPlaybackState = { activeSlideIds: ['slide-1'] };
  const secondPlaybackState = { activeSlideIds: ['slide-2'] };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(firstPlaybackState, { id: 1 }))),
    { playbackState: firstPlaybackState }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(secondPlaybackState, { id: 2 }))),
    { playbackState: secondPlaybackState }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('sanitizeEditorReusablePersistedHtml delegates through the editor persistence-state adapter', () => {
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      sanitizeStudioReusablePersistedHtml(persistedHtml, options = {}) {
        delegatedArgs = {
          persistedHtml,
          playbackState: options.playbackState,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          resolveMetadataPersistenceOptions: options.resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions: options.getDeckSanitizerOptions,
          DOMParser: options.DOMParser
        };
        return '<html>sanitized</html>';
      }
    },
    DOMParser: class DOMParser {}
  };
  const buildPersistableDeckHtml = () => '<html>built</html>';
  const resolveMetadataPersistenceOptions = () => ({ emptyContainerIds: ['pixelMatrix'] });
  const getDeckSanitizerOptions = () => ({ chromeNodeIds: ['editorSelectionOverlay'] });

  vm.createContext(context);
  loadSanitizeEditorReusablePersistedHtml(context);

  assert.equal(context.sanitizeEditorReusablePersistedHtml('<html>persisted</html>', {
    playbackState,
    buildPersistableDeckHtml,
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  }), '<html>sanitized</html>');
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.playbackState, playbackState);
  assert.equal(delegatedArgs.buildPersistableDeckHtml, buildPersistableDeckHtml);
  assert.equal(delegatedArgs.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedArgs.getDeckSanitizerOptions, getDeckSanitizerOptions);
  assert.equal(delegatedArgs.DOMParser, context.DOMParser);
});

test('sanitizeEditorReusablePersistedHtml delegates to the persistence controller when available', () => {
  const buildPersistableDeckHtml = () => '<html>built</html>';
  const resolveMetadataPersistenceOptions = () => ({ emptyContainerIds: ['pixelMatrix'] });
  const getDeckSanitizerOptions = () => ({ chromeNodeIds: ['editorSelectionOverlay'] });
  let delegatedArgs = null;
  const context = {
    studioEditorPersistenceController: {
      sanitizeReusablePersistedHtml(persistedHtml, options) {
        delegatedArgs = { persistedHtml, options };
        return '<html>controller-sanitized</html>';
      }
    },
    DOMParser: class DOMParser {}
  };

  vm.createContext(context);
  loadSanitizeEditorReusablePersistedHtml(context);

  assert.equal(context.sanitizeEditorReusablePersistedHtml('<html>persisted</html>', {
    buildPersistableDeckHtml,
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  }), '<html>controller-sanitized</html>');
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.options.buildPersistableDeckHtml, buildPersistableDeckHtml);
  assert.equal(delegatedArgs.options.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedArgs.options.getDeckSanitizerOptions, getDeckSanitizerOptions);
  assert.equal(delegatedArgs.options.DOMParser, context.DOMParser);
});

test('sanitizeEditorReusablePersistedHtml creates the shared persistence-state adapter once', () => {
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorReusablePersistedHtmlSanitizerAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        return (persistedHtml, nextOptions) => {
          calls.push([persistedHtml, nextOptions]);
          return `${persistedHtml}:${nextOptions.id}`;
        };
      }
    }
  };

  vm.createContext(context);
  loadSanitizeEditorReusablePersistedHtml(context);

  assert.equal(
    context.sanitizeEditorReusablePersistedHtml('<html>one</html>', { id: 1 }),
    '<html>one</html>:1'
  );
  assert.equal(
    context.sanitizeEditorReusablePersistedHtml('<html>two</html>', { id: 2 }),
    '<html>two</html>:2'
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.id), [1, 2]);
});

test('sanitizeEditorReusablePersistedHtml reuses the local persistable deck sanitizer options helper when available', () => {
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
  loadSanitizeEditorReusablePersistedHtml(context);
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
  loadSanitizeEditorReusablePersistedHtml(context);

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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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

test('buildPersistableDeckHtml delegates document dispatch through the persistence controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );
  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    studioEditorPersistenceController: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return nextDoc ? 'document-html' : 'fallback-html';
      }
    },
    SlideNextStudioEditorPersistence: {
      buildStudioPersistableDeckHtmlFromDocument() {
        throw new Error('shared document builder should be bypassed by the controller');
      }
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(doc, { id: 1 }), 'document-html');
  assert.equal(context.buildPersistableDeckHtml(null, { id: 2 }), 'fallback-html');
  assert.equal(calls[0][0], doc);
  assert.equal(typeof calls[0][1].resolveCanonicalDeck, 'function');
  assert.equal(calls[1][0], null);
  assert.equal(typeof calls[1][1].getPersistedDeckState, 'function');
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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

test('buildPersistableDeckHtml resolves the canonical deck without a reporting callback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let resolvedCanonicalDeck = null;
  let canonicalBuildCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {
      buildStudioPersistableDeckHtmlFromDocument(nextDoc, options = {}) {
        assert.equal(nextDoc, iframeDoc);
        resolvedCanonicalDeck = options.resolveCanonicalDeck(false);
        return '<html>persisted-live</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      canonicalBuildCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(iframeDoc), '<html>persisted-live</html>');
  assert.equal(resolvedCanonicalDeck, canonicalDeck);
  assert.equal(canonicalBuildCalls, 1);
});

test('buildPersistableDeckHtml reuses the local persistable deck sanitizer options helper when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      resolveStudioFallbackActiveSlideId: deckView.resolveStudioFallbackActiveSlideId
    },
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
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
  installSlideIndexAccessor(context);

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadCapturePersistedDeckPlaybackState(context);
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
  loadCapturePersistedDeckPlaybackState(context);

  assert.equal(context.capturePersistedDeckPlaybackState(), playbackState);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('capturePersistedDeckPlaybackState fails closed when the shared persistence runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id'
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  loadCapturePersistedDeckPlaybackState(context);

  assert.equal(context.capturePersistedDeckPlaybackState(null), null);
});

test('capturePersistedDeckPlaybackState delegates fallback active slide resolution to the shared deck persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
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
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      resolveStudioFallbackActiveSlideId: deckView.resolveStudioFallbackActiveSlideId
    },
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
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
  loadCapturePersistedDeckPlaybackState(context);

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
  loadCapturePersistedDeckPlaybackState(context);

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
  loadCapturePersistedDeckPlaybackState(context);

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

test('capturePersistedDeckPlaybackState delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let factoryOptions = null;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckPlaybackStateCapturer(options = {}) {
        factoryOptions = options;
        return (doc) => ({
          doc,
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(),
          slideIdAttr: options.slideIdAttr
        });
      }
    },
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackStateWithFallback() {},
      capturePersistedDeckPlaybackState() {},
      ensurePersistedDeckPlaybackStateActiveSlideId() {}
    },
    getSlides() {
      return [];
    },
    resolveEditorFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return 'slide-1';
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run for an explicit canonical deck');
    }
  };

  vm.createContext(context);
  loadCapturePersistedDeckPlaybackState(context);

  assert.deepEqual(context.capturePersistedDeckPlaybackState(iframeDoc, canonicalDeck), {
    doc: iframeDoc,
    fallbackActiveSlideId: 'slide-1',
    slideIdAttr: 'data-slide-id'
  });
  assert.equal(factoryOptions.getSlides, context.getSlides);
  assert.equal(factoryOptions.slideIdAttr, 'data-slide-id');
});

test('capturePersistedDeckPlaybackState creates the shared persistence-state adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let adapterCreateCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: {},
    SlideNextDeckPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistedDeckPlaybackStateCapturerAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, context.SlideNextStudioEditorPersistence);
        assert.equal(options.deckPersistenceApi, context.SlideNextDeckPersistence);
        return (doc, nextOptions) => {
          calls.push([doc, nextOptions]);
          return { id: nextOptions.canonicalDeck.id };
        };
      }
    },
    getSlides() {
      return [];
    },
    resolveEditorFallbackActiveSlideId() {
      return 'slide-1';
    },
    buildEditorCanonicalDeck() {
      return { id: 'built' };
    }
  };

  vm.createContext(context);
  loadCapturePersistedDeckPlaybackState(context);

  const iframeDoc = { label: 'iframe-doc' };
  assert.deepEqual(
    context.capturePersistedDeckPlaybackState(iframeDoc, { id: 'one' }),
    { id: 'one' }
  );
  assert.deepEqual(
    context.capturePersistedDeckPlaybackState(iframeDoc, { id: 'two' }),
    { id: 'two' }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([, options]) => options.canonicalDeck.id), ['one', 'two']);
});

test('capturePersistedDeckPlaybackState delegates through the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
  loadCapturePersistedDeckPlaybackState(context);

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
  let canonicalBuildOptions = null;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      resolveStudioFallbackActiveSlideId: deckView.resolveStudioFallbackActiveSlideId
    },
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
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc, options) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      canonicalBuildOptions = options;
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
  loadCapturePersistedDeckPlaybackState(context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState())),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
  assert.equal(canonicalBuildOptions, undefined);
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let reportedCanonicalDeck = null;
  let buildEditorCanonicalDeckCalls = 0;
  let canonicalBuildOptions = null;
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
    buildEditorCanonicalDeck(nextDoc, options) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      canonicalBuildOptions = options;
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
  assert.equal(canonicalBuildOptions, undefined);
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState,
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
  installSlideIndexAccessor(context);

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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    SlideNextStudioDeckView: {
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    SlideNextStudioDeckView: {
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
    SlideNextStudioDeckView: {
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState,
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
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
  installSlideIndexAccessor(context);

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
