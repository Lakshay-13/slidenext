const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const preview = require('../shared/studio-preview.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('resetStudioPresentationUiState clears stale preview chrome and exits fullscreen for the modal', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioPresentationUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioPresentationUiState() {',
    '\n\n    function closePresentation() {'
  );

  const elements = {
    presentationModal: {
      classList: createClassList(['active', 'opacity-100'])
    },
    presentationFrame: {
      __slideNextPreviewLoadToken: 1,
      onload: () => {},
      src: '/presentations/stale/index.html',
      srcdoc: '<html>stale preview</html>',
      removeAttribute() {}
    },
    fsIcon: {
      textContent: 'fullscreen_exit'
    }
  };

  let exitFullscreenCalls = 0;
  const documentStub = {
    body: {
      style: {
        overflow: 'hidden'
      }
    },
    fullscreenElement: elements.presentationModal,
    getElementById(id) {
      return elements[id] || null;
    },
    exitFullscreen() {
      exitFullscreenCalls += 1;
      this.fullscreenElement = null;
      return Promise.resolve();
    }
  };

  const context = {
    SlideNextStudioPreview: preview,
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioPresentationUiStateSource, context);

  context.resetStudioPresentationUiState();

  assert.equal(exitFullscreenCalls, 1);
  assert.equal(documentStub.fullscreenElement, null);
  assert.equal(elements.presentationFrame.onload, null);
  assert.equal(elements.presentationFrame.src, '');
  assert.equal(elements.presentationFrame.srcdoc, '');
  assert.equal(elements.presentationModal.classList.contains('active'), false);
  assert.equal(elements.presentationModal.classList.contains('hidden'), true);
  assert.equal(elements.presentationModal.classList.contains('opacity-0'), true);
  assert.equal(elements.presentationModal.classList.contains('pointer-events-none'), true);
  assert.equal(elements.presentationModal.classList.contains('opacity-100'), false);
  assert.equal(documentStub.body.style.overflow, '');
  assert.equal(elements.fsIcon.textContent, 'fullscreen');
});

test('launchPresentation delegates url preview chrome resolution to the shared preview helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchPresentationSource = extractFunctionSource(
    fileContent,
    'function launchPresentation(url, startSlideIdx) {',
    '\n\n    function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const elements = {
    presentationModal: { id: 'presentationModal' },
    presentationFrame: { id: 'presentationFrame' }
  };
  const calls = [];
  const context = {
    SlideNextStudioPreview: {
      launchPresentationUrl(options = {}) {
        calls.push(options);
      }
    },
    document: {
      body: { style: {} },
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(launchPresentationSource, context);

  context.launchPresentation('/presentations/onboarding-presentation/index.html', 3);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    document: {
      body: { style: {} }
    },
    startSlideIdx: 3,
    url: '/presentations/onboarding-presentation/index.html'
  }]);
});

test('launchPreview does not open preview flows when the present button is disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchPreviewSource = extractFunctionSource(
    fileContent,
    'function launchPreview() {',
    '\n  </script>'
  );

  let buildEditorPreviewHtmlCalls = 0;
  let launchPresentationHtmlCalls = 0;
  let launchPresentationCalls = 0;
  const context = {
    buildEditorPreviewHtml() {
      buildEditorPreviewHtmlCalls += 1;
      return '<html>preview</html>';
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'launchPreviewBtn') {
          return { disabled: true };
        }
        return null;
      }
    },
    getStudioActiveSlideIndex() {
      return 2;
    },
    launchPresentation() {
      launchPresentationCalls += 1;
    },
    launchPresentationHtml() {
      launchPresentationHtmlCalls += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(launchPreviewSource, context);

  context.launchPreview();

  assert.equal(buildEditorPreviewHtmlCalls, 0);
  assert.equal(launchPresentationHtmlCalls, 0);
  assert.equal(launchPresentationCalls, 0);
});

test('launchPreview delegates the launch-mode decision to the shared preview helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchPreviewSource = extractFunctionSource(
    fileContent,
    'function launchPreview() {',
    '\n  </script>'
  );

  const elements = {
    launchPreviewBtn: { disabled: false },
    presentationModal: { id: 'presentationModal' },
    presentationFrame: { id: 'presentationFrame' }
  };
  const calls = [];
  const context = {
    SlideNextStudioPreview: {
      launchStudioPresentation(options = {}) {
        calls.push(options);
        return 'html';
      }
    },
    buildEditorPreviewHtml() {
      return '<html>preview</html>';
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      body: { style: {} },
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getStudioActiveSlideIndex() {
      return 2;
    }
  };

  vm.createContext(context);
  vm.runInContext(launchPreviewSource, context);

  context.launchPreview();

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    document: {
      body: { style: {} }
    },
    startSlideIdx: 2,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    previewHtml: '<html>preview</html>'
  }]);
});

test('buildEditorPreviewHtml falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const calls = [];
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioDeckView: {
      buildStudioPreviewHtml(doc, options) {
        calls.push({
          doc,
          options,
          canonicalDeck: options.buildCanonicalDeck(doc)
        });
        return options.buildFallbackHtml(null);
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      assert.equal(nextDoc, null);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return context.lastPersistedDeckHtml;
    },
    currentSlideIndex: 1,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-preview</html>'
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  const result = context.buildEditorPreviewHtml();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, null);
  assert.equal(calls[0].canonicalDeck, canonicalDeck);
  assert.equal(calls[0].options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.activeSlideId, 'slide-2');
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
  assert.equal(result, '<html>persisted-preview</html>');
});

test('buildEditorPreviewHtml falls back to the shared deck html preview builder when the deck view helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {},
    SlideNextDeckHtml: {
      buildDeckPreviewHtml(nextCanonicalDeck, presentationUrl, options) {
        calls.push({ nextCanonicalDeck, presentationUrl, options });
        return '<html>preview-from-deck-html</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when preview html renders from the canonical deck');
    },
    currentSlideIndex: 1,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  const result = context.buildEditorPreviewHtml();

  assert.equal(result, '<html>preview-from-deck-html</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextCanonicalDeck, canonicalDeck);
  assert.equal(calls[0].presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0].options.renderOptions.activeSlideId, 'slide-2');
});

test('createEditorDeckViewBuildViewOptionsResolver decorates resolved deck view options when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorDeckViewBuildViewOptionsResolverSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewBuildViewOptionsResolver(options = {}) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const baseDeckViewOptions = {
    buildCanonicalDeck() {
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      };
    },
    deckHtmlOptions: {
      renderOptions: {
        activeSlideId: 'slide-1'
      }
    }
  };
  const calls = [];
  const context = {
    createEditorDeckViewBuildOptions(sourceDoc) {
      calls.push(['createEditorDeckViewBuildOptions', sourceDoc]);
      return baseDeckViewOptions;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorDeckViewBuildViewOptionsResolverSource, context);

  const resolveViewOptions = context.createEditorDeckViewBuildViewOptionsResolver({
    extendViewOptions(deckViewOptions, sourceDoc) {
      calls.push(['extendViewOptions', deckViewOptions, sourceDoc]);
      return {
        ...deckViewOptions,
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    }
  });
  const result = resolveViewOptions();

  assert.equal(result.buildCanonicalDeck, baseDeckViewOptions.buildCanonicalDeck);
  assert.equal(result.deckHtmlOptions, baseDeckViewOptions.deckHtmlOptions);
  assert.equal(result.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ['createEditorDeckViewBuildOptions', iframeDoc]);
  assert.equal(calls[1][0], 'extendViewOptions');
  assert.equal(calls[1][1], baseDeckViewOptions);
  assert.equal(calls[1][2], iframeDoc);
});

test('createEditorDeckViewCanonicalHtmlResolver remaps canonical html arguments when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorDeckViewCanonicalHtmlResolverSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewCanonicalHtmlResolver(options = {}) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-1'
    }
  };
  const calls = [];
  const context = {};

  vm.createContext(context);
  vm.runInContext(createEditorDeckViewCanonicalHtmlResolverSource, context);

  const resolveCanonicalHtml = context.createEditorDeckViewCanonicalHtmlResolver({
    buildCanonicalHtml(nextCanonicalDeck, presentationUrl, nextDeckHtmlOptions) {
      calls.push([nextCanonicalDeck, presentationUrl, nextDeckHtmlOptions]);
      return '<html>preview-from-canonical-html</html>';
    },
    mapCanonicalHtmlArgs(nextCanonicalDeck, nextDeckHtmlOptions) {
      return [
        nextCanonicalDeck,
        '/presentations/onboarding-presentation/index.html',
        nextDeckHtmlOptions
      ];
    }
  });
  const result = resolveCanonicalHtml(canonicalDeck, deckHtmlOptions);

  assert.equal(result, '<html>preview-from-canonical-html</html>');
  assert.deepEqual(calls, [[
    canonicalDeck,
    '/presentations/onboarding-presentation/index.html',
    deckHtmlOptions
  ]]);
});

test('createEditorPreviewFallbackHtmlTransformer injects a preview base href when preview deck html helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorPreviewFallbackHtmlTransformerSource = extractFunctionSource(
    fileContent,
    'function createEditorPreviewFallbackHtmlTransformer(options = {}) {',
    '\n\n    function createEditorPreviewDeckViewHtmlOptions(options = {}) {'
  );

  const calls = [];
  const deckHtmlOptions = {
    currentLocationHref: 'http://localhost:3000/'
  };
  const context = {};

  vm.createContext(context);
  vm.runInContext(createEditorPreviewFallbackHtmlTransformerSource, context);

  const transformFallbackHtml = context.createEditorPreviewFallbackHtmlTransformer({
    injectBaseHrefIntoHtml(fallbackHtml, baseHref) {
      calls.push(['injectBaseHrefIntoHtml', fallbackHtml, baseHref]);
      return `<html data-base-href="${baseHref}">${fallbackHtml}</html>`;
    },
    buildPresentationBaseHref(presentationUrl, nextDeckHtmlOptions) {
      calls.push(['buildPresentationBaseHref', presentationUrl, nextDeckHtmlOptions]);
      return `${presentationUrl}#preview`;
    },
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  const result = transformFallbackHtml('<html>fallback</html>', deckHtmlOptions);

  assert.equal(
    result,
    '<html data-base-href="/presentations/onboarding-presentation/index.html#preview"><html>fallback</html></html>'
  );
  assert.deepEqual(calls, [
    ['buildPresentationBaseHref', '/presentations/onboarding-presentation/index.html', deckHtmlOptions],
    [
      'injectBaseHrefIntoHtml',
      '<html>fallback</html>',
      '/presentations/onboarding-presentation/index.html#preview'
    ]
  ]);
});

test('createEditorPreviewDeckViewHtmlOptions bundles preview deck view resolvers when local helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorPreviewDeckViewHtmlOptionsSource = extractFunctionSource(
    fileContent,
    'function createEditorPreviewDeckViewHtmlOptions(options = {}) {',
    '\n\n    function buildEditorSourceDeckHtml(doc = getIframeDoc(), options = {}) {'
  );

  const buildViewOptionsResolver = function buildViewOptionsResolver() {};
  const canonicalHtmlResolver = function canonicalHtmlResolver() {};
  const previewFallbackHtmlTransformer = function previewFallbackHtmlTransformer() {};
  let buildViewOptionsResolverArgs = null;
  let canonicalHtmlResolverArgs = null;
  let previewFallbackHtmlTransformerArgs = null;
  const buildStudioPreviewHtml = function buildStudioPreviewHtml() {};
  const buildDeckPreviewHtml = function buildDeckPreviewHtml() {};
  const injectBaseHrefIntoHtml = function injectBaseHrefIntoHtml() {};
  const buildPresentationBaseHref = function buildPresentationBaseHref() {};
  const context = {
    __createEditorDeckViewBuildViewOptionsResolver(options) {
      buildViewOptionsResolverArgs = options;
      return buildViewOptionsResolver;
    },
    __createEditorDeckViewCanonicalHtmlResolver(options) {
      canonicalHtmlResolverArgs = options;
      return canonicalHtmlResolver;
    },
    __createEditorPreviewFallbackHtmlTransformer(options) {
      previewFallbackHtmlTransformerArgs = options;
      return previewFallbackHtmlTransformer;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorPreviewDeckViewHtmlOptionsSource, context);
  vm.runInContext(
    'createEditorDeckViewBuildViewOptionsResolver = __createEditorDeckViewBuildViewOptionsResolver;'
      + 'createEditorDeckViewCanonicalHtmlResolver = __createEditorDeckViewCanonicalHtmlResolver;'
      + 'createEditorPreviewFallbackHtmlTransformer = __createEditorPreviewFallbackHtmlTransformer;',
    context
  );

  const result = context.createEditorPreviewDeckViewHtmlOptions({
    buildStudioPreviewHtml,
    buildDeckPreviewHtml,
    injectBaseHrefIntoHtml,
    buildPresentationBaseHref,
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });

  assert.equal(result.buildSharedHtml, buildStudioPreviewHtml);
  assert.equal(result.buildViewOptions, buildViewOptionsResolver);
  assert.equal(result.buildCanonicalHtml, canonicalHtmlResolver);
  assert.equal(result.transformFallbackHtml, previewFallbackHtmlTransformer);
  assert.equal(typeof buildViewOptionsResolverArgs.extendViewOptions, 'function');
  assert.equal(buildViewOptionsResolverArgs.extendViewOptions({ buildCanonicalDeck() {} }).presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(canonicalHtmlResolverArgs.buildCanonicalHtml, buildDeckPreviewHtml);
  const canonicalHtmlArgs = canonicalHtmlResolverArgs.mapCanonicalHtmlArgs('deck', { renderOptions: {} });
  assert.equal(canonicalHtmlArgs[0], 'deck');
  assert.equal(canonicalHtmlArgs[1], '/presentations/onboarding-presentation/index.html');
  assert.deepEqual(canonicalHtmlArgs[2], { renderOptions: {} });
  assert.equal(previewFallbackHtmlTransformerArgs.injectBaseHrefIntoHtml, injectBaseHrefIntoHtml);
  assert.equal(previewFallbackHtmlTransformerArgs.buildPresentationBaseHref, buildPresentationBaseHref);
  assert.equal(previewFallbackHtmlTransformerArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
});

test('buildEditorPreviewHtml reuses the shared deck-view html builder when the preview helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const context = {
    SlideNextStudioDeckView: {
      buildStudioDeckHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>preview-from-deck-view-html</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  const result = context.buildEditorPreviewHtml();

  assert.equal(result, '<html>preview-from-deck-view-html</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, null);
  assert.equal(typeof calls[0].options.buildFallbackHtml, 'function');
  assert.equal(typeof calls[0].options.transformFallbackHtml, 'function');
});

test('buildEditorPreviewHtml reuses the shared deck-view helper for editor deck-view html orchestration when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const canonicalHtmlCalls = [];
  const fallbackHtmlCalls = [];
  let createEditorDeckViewBuildOptionsCalls = 0;
  const baseDeckViewOptions = {
    buildCanonicalDeck() {
      return null;
    },
    buildFallbackHtml() {
      return '<html>fallback</html>';
    },
    deckHtmlOptions: {
      renderOptions: {
        activeSlideId: 'slide-1'
      }
    }
  };
  const context = {
    SlideNextStudioDeckView: {
      buildStudioDeckViewHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>preview-from-shared-deck-view-helper</html>';
      }
    },
    SlideNextDeckHtml: {
      buildDeckPreviewHtml(nextCanonicalDeck, presentationUrl, nextDeckHtmlOptions) {
        canonicalHtmlCalls.push([nextCanonicalDeck, presentationUrl, nextDeckHtmlOptions]);
        return '<html>preview-from-canonical-html</html>';
      },
      injectBaseHrefIntoHtml(fallbackHtml, baseHref) {
        fallbackHtmlCalls.push(['injectBaseHrefIntoHtml', fallbackHtml, baseHref]);
        return `<html data-base-href="${baseHref}">${fallbackHtml}</html>`;
      },
      buildPresentationBaseHref(presentationUrl, nextDeckHtmlOptions) {
        fallbackHtmlCalls.push(['buildPresentationBaseHref', presentationUrl, nextDeckHtmlOptions]);
        return `${presentationUrl}#preview`;
      }
    },
    __createEditorDeckViewBuildOptions(nextDoc) {
      createEditorDeckViewBuildOptionsCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return baseDeckViewOptions;
    },
    currentSlideIndex: 1,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);
  vm.runInContext('createEditorDeckViewBuildOptions = __createEditorDeckViewBuildOptions;', context);

  const result = context.buildEditorPreviewHtml();

  assert.equal(result, '<html>preview-from-shared-deck-view-helper</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, iframeDoc);
  assert.equal(typeof calls[0].options.buildViewOptions, 'function');
  assert.equal(typeof calls[0].options.transformFallbackHtml, 'function');
  const deckViewOptions = calls[0].options.buildViewOptions(iframeDoc);
  assert.equal(createEditorDeckViewBuildOptionsCalls, 1);
  assert.equal(deckViewOptions.buildCanonicalDeck, baseDeckViewOptions.buildCanonicalDeck);
  assert.equal(deckViewOptions.buildFallbackHtml, baseDeckViewOptions.buildFallbackHtml);
  assert.equal(deckViewOptions.deckHtmlOptions, baseDeckViewOptions.deckHtmlOptions);
  assert.equal(deckViewOptions.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof calls[0].options.buildCanonicalHtml, 'function');
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-1'
    },
    currentLocationHref: 'http://localhost:3000/'
  };
  assert.equal(
    calls[0].options.buildCanonicalHtml(canonicalDeck, deckHtmlOptions),
    '<html>preview-from-canonical-html</html>'
  );
  assert.deepEqual(canonicalHtmlCalls, [[
    canonicalDeck,
    '/presentations/onboarding-presentation/index.html',
    deckHtmlOptions
  ]]);
  assert.equal(
    calls[0].options.transformFallbackHtml('<html>fallback</html>', deckHtmlOptions),
    '<html data-base-href="/presentations/onboarding-presentation/index.html#preview"><html>fallback</html></html>'
  );
  assert.deepEqual(fallbackHtmlCalls, [
    ['buildPresentationBaseHref', '/presentations/onboarding-presentation/index.html', deckHtmlOptions],
    [
      'injectBaseHrefIntoHtml',
      '<html>fallback</html>',
      '/presentations/onboarding-presentation/index.html#preview'
    ]
  ]);
});

test('buildEditorPreviewHtml prefers the live active slide when the editor frame is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return { label: 'active-slide' };
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      buildStudioPreviewHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>preview</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when preview html renders from the canonical deck');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-2';
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  const result = context.buildEditorPreviewHtml();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, iframeDoc);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.activeSlideId, 'slide-2');
  assert.equal(result, '<html>preview</html>');
});

test('buildEditorPreviewHtml reuses the resolved live canonical deck when preview generation falls back', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return { label: 'active-slide' };
    }
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioDeckView: {
      buildStudioPreviewHtml(doc, options) {
        assert.equal(options.buildCanonicalDeck(doc), canonicalDeck);
        return options.buildFallbackHtml(doc);
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return '<html>persisted-preview</html>';
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-1';
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  assert.equal(context.buildEditorPreviewHtml(), '<html>persisted-preview</html>');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorPreviewHtml falls back to the current session slide when live active slide state is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioDeckView: {
      buildStudioPreviewHtml(doc, options) {
        assert.equal(options.buildCanonicalDeck(doc), canonicalDeck);
        return options.deckHtmlOptions.renderOptions.activeSlideId;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when preview html resolves through the canonical deck');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 1,
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);

  assert.equal(context.buildEditorPreviewHtml(), 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});
