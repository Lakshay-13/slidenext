const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const preview = require('../shared/studio-preview.js');
const deckView = require('../shared/studio-deck-view.js');
const sourceController = require('../shared/studio-editor-source-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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

function attachDeckViewHtmlOptions(context) {
  if (context && context.SlideNextStudioDeckView) {
    context.SlideNextStudioDeckView = {
      ...context.SlideNextStudioDeckView,
      createStudioDeckViewHtmlOptions: deckView.createStudioDeckViewHtmlOptions
    };
  }
  return context;
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

test('resetStudioSourceViewUiState clears stale source modal chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioSourceViewUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioSourceViewUiState() {',
    '\n\n    // Sync fullscreen button icon when native fullscreen changes'
  );

  const elements = {
    sourceViewModal: {
      classList: createClassList(['opacity-100'])
    },
    sourceViewModalContent: {
      classList: createClassList(['scale-100'])
    },
    sourceViewContent: {
      value: '<html>stale source</html>',
      scrollTop: 24
    }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    SlideNextStudioPreview: preview,
    studioEditorSourceController: {
      reset() {
        return preview.resetStudioSourceViewUiState({ document: documentStub });
      }
    },
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioSourceViewUiStateSource, context);

  context.resetStudioSourceViewUiState();

  assert.equal(elements.sourceViewContent.value, '');
  assert.equal(elements.sourceViewContent.scrollTop, 0);
  assert.equal(elements.sourceViewModal.classList.contains('hidden'), true);
  assert.equal(elements.sourceViewModal.classList.contains('opacity-0'), true);
  assert.equal(elements.sourceViewModal.classList.contains('opacity-100'), false);
  assert.equal(elements.sourceViewModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.sourceViewModalContent.classList.contains('scale-100'), false);
});

test('openSourceViewModal delegates source view opening to the shared preview helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const openSourceViewModalSource = extractFunctionSource(
    fileContent,
    'function openSourceViewModal() {',
    '\n\n    function closeSourceViewModal() {'
  );

  let openCalls = 0;
  const context = {
    studioEditorSourceController: {
      open() {
        openCalls += 1;
        return true;
      }
    },
  };

  vm.createContext(context);
  vm.runInContext(openSourceViewModalSource, context);

  assert.equal(context.openSourceViewModal(), true);
  assert.equal(openCalls, 1);
});

test('applyEditorSourceHtml wires canonical source editing through the shared pipeline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function applyEditorSourceHtml(sourceHtml = \'\') {',
    '\n\n    function applySourceViewModal() {'
  );

  let delegatedSourceHtml = '';
  const context = {
    studioEditorSourceController: {
      applySourceHtml(sourceHtml) {
        delegatedSourceHtml = sourceHtml;
        return { success: true };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(applyEditorSourceHtmlSource, context);

  assert.deepEqual(context.applyEditorSourceHtml('<html>edited</html>'), { success: true });
  assert.equal(delegatedSourceHtml, '<html>edited</html>');
});

test('source history restore propagates canonical frame restore failures', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreEditorSourceHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function restoreEditorSourceHistoryEntry(historyEntry) {',
    '\n\n    function applySourceViewModal() {'
  );
  const calls = [];
  const context = {
    restoreFrameFromHistoryEntry(historyEntry) {
      calls.push(historyEntry);
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(restoreEditorSourceHistoryEntrySource, context);

  assert.equal(context.restoreEditorSourceHistoryEntry({ id: 'failed-entry' }), false);
  assert.deepEqual(calls, [{ id: 'failed-entry' }]);
});

test('source history capture prefers the current canonical deck before source replacement', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument() {
      return { id: 'current-frame' };
    },
    getCanonicalDeckBaseline(doc) {
      calls.push(['resolver', doc]);
      return canonicalDeck;
    },
    buildCanonicalDeck() {
      calls.push(['build']);
      throw new Error('DOM rebuild should not be needed when live canonical state exists');
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    }
  });

  assert.equal(capture(), true);
  assert.deepEqual(calls, [
    ['resolver', { id: 'current-frame' }],
    ['history', false, null, canonicalDeck]
  ]);
});

test('source history capture keeps the legacy fallback when canonical rebuilding fails', () => {
  const calls = [];
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument() {
      return { id: 'current-frame' };
    },
    getCanonicalDeckBaseline() {
      return null;
    },
    buildCanonicalDeck() {
      throw new Error('canonical rebuild failed');
    },
    saveHistoryState(...args) {
      calls.push(args);
    }
  });

  assert.equal(capture(), true);
  assert.deepEqual(calls, [[false]]);
});

test('applySourceViewModal delegates source application to the controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySourceViewModalSource = extractFunctionSource(
    fileContent,
    'function applySourceViewModal() {',
    '\n\n    function closeSourceViewModal() {'
  );
  let applyCalls = 0;
  const context = {
    studioEditorSourceController: {
      apply() {
        applyCalls += 1;
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(applySourceViewModalSource, context);

  assert.equal(context.applySourceViewModal(), true);
  assert.equal(applyCalls, 1);
});

test('launchPresentationHtml fails closed when the shared preview runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchPresentationHtmlSource = extractFunctionSource(
    fileContent,
    'function launchPresentationHtml(html, startSlideIdx) {',
    '\n\n    function openSourceViewModal() {'
  );
  const context = { document: {} };

  vm.createContext(context);
  vm.runInContext(launchPresentationHtmlSource, context);

  assert.equal(context.launchPresentationHtml('<html></html>', 1), false);
});

test('launchPresentationHtml prefers the shared preview controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchPresentationHtmlSource = extractFunctionSource(
    fileContent,
    'function launchPresentationHtml(html, startSlideIdx) {',
    '\n\n    function openSourceViewModal() {'
  );
  const calls = [];
  const context = {
    studioEditorPreviewController: {
      launchHtml(html, startSlideIdx) {
        calls.push([html, startSlideIdx]);
        return 'controller-result';
      }
    },
    SlideNextStudioPreview: {
      launchPresentationHtml() {
        throw new Error('legacy fallback should not run');
      }
    },
    document: {}
  };

  vm.createContext(context);
  vm.runInContext(launchPresentationHtmlSource, context);

  assert.equal(context.launchPresentationHtml('<html></html>', 2), 'controller-result');
  assert.deepEqual(calls, [['<html></html>', 2]]);
});

test('buildEditorSourceHtml falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState,
      resolveStudioLiveActiveSlide(nextDoc) {
        return nextDoc && nextDoc.querySelector('.slide-active');
      },
      resolveStudioLiveActiveSlideId(nextDoc, options) {
        return nextDoc && nextDoc.querySelector('.slide-active') && options.getActiveSlideId(nextDoc);
      },
      buildStudioSourceHtml(doc, options) {
        calls.push({
          doc,
          options,
          canonicalDeck: options.buildCanonicalDeck(doc)
        });
        return options.buildFallbackHtml(null);
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
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      assert.equal(nextDoc, null);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return context.lastPersistedDeckHtml;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, null);
      return null;
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>'
  };

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  const result = context.buildEditorSourceHtml();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, null);
  assert.equal(calls[0].canonicalDeck, canonicalDeck);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.activeSlideId, 'slide-2');
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
  assert.equal(result, '<html>persisted-baseline</html>');
});

test('buildEditorSourceHtml fails closed when the shared deck html helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
  );

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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when source html renders from the canonical deck');
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, null);
      return null;
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  const result = context.buildEditorSourceHtml();

  assert.equal(result, '');
});

test('buildEditorSourceHtml reuses the shared deck-view html builder when the source helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
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
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      buildStudioDeckHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>source-from-deck-view-html</html>';
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, null);
      return null;
    },
    getPersistedActiveSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  const result = context.buildEditorSourceHtml();

  assert.equal(result, '<html>source-from-deck-view-html</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, null);
  assert.equal(typeof calls[0].options.buildFallbackHtml, 'function');
});

test('buildEditorSourceDeckHtml forwards source deck view builders when local helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-live'
    }
  };
  const calls = [];
  let delegatedArgs = null;
  const buildStudioSourceHtml = function buildStudioSourceHtml() {};
  const buildDeckSourceHtml = function buildDeckSourceHtml(...args) {
    calls.push(['buildDeckSourceHtml', args]);
    return '<html>source-from-canonical-deck</html>';
  };
  const context = {
    SlideNextStudioDeckView: {
      buildStudioSourceHtml
    },
    SlideNextDeckHtml: {
      buildDeckSourceHtml
    },
    __buildEditorDeckViewHtml(doc, options) {
      delegatedArgs = { doc, options };
      return '<html>source-from-shared-deck-view-helper</html>';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);
  vm.runInContext('buildEditorDeckViewHtml = __buildEditorDeckViewHtml;', context);

  const customBuildViewOptions = function customBuildViewOptions(nextDoc) {
    calls.push(['buildViewOptions', nextDoc]);
    return {
      activeSlideId: 'slide-custom'
    };
  };
  const result = context.buildEditorSourceDeckHtml(iframeDoc, {
    buildViewOptions: customBuildViewOptions
  });

  assert.equal(result, '<html>source-from-shared-deck-view-helper</html>');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.buildSharedHtml, buildStudioSourceHtml);
  assert.equal(delegatedArgs.options.buildCanonicalHtml(canonicalDeck, deckHtmlOptions), '<html>source-from-canonical-deck</html>');
  assert.deepEqual(delegatedArgs.options.buildViewOptions(iframeDoc), {
    activeSlideId: 'slide-custom'
  });
  assert.deepEqual(calls, [
    ['buildDeckSourceHtml', [canonicalDeck, deckHtmlOptions]],
    ['buildViewOptions', iframeDoc]
  ]);
});

test('buildEditorSourceDeckHtml delegates to the shared source builder before inline composition', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function buildEditorSourceDeckHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function buildEditorSourceHtml(doc = getIframeDoc()) {'
  );
  const iframeDoc = { id: 'editor-doc' };
  const calls = [];
  const context = {
    studioEditorSourceHtmlBuilder(nextDoc, options) {
      calls.push([nextDoc, options]);
      return '<html>shared-source</html>';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  assert.equal(
    context.buildEditorSourceDeckHtml(iframeDoc, { buildViewOptions: () => ({}) }),
    '<html>shared-source</html>'
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], iframeDoc);
  assert.equal(typeof calls[0][1].buildViewOptions, 'function');
});

test('buildEditorSourceDeckHtml prefers provided source deck html builder overrides when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-live'
    }
  };
  const customBuildStudioSourceHtml = function customBuildStudioSourceHtml() {};
  const customBuildDeckSourceHtml = function customBuildDeckSourceHtml(...args) {
    return JSON.stringify(args);
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      buildStudioSourceHtml() {
        throw new Error('default studio source html builder should not run');
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    SlideNextDeckHtml: {
      buildDeckSourceHtml() {
        throw new Error('default deck source html builder should not run');
      }
    },
    __buildEditorDeckViewHtml(doc, options) {
      delegatedArgs = { doc, options };
      return '<html>source-from-shared-deck-view-helper</html>';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);
  vm.runInContext('buildEditorDeckViewHtml = __buildEditorDeckViewHtml;', context);

  const result = context.buildEditorSourceDeckHtml(iframeDoc, {
    buildStudioSourceHtml: customBuildStudioSourceHtml,
    buildDeckSourceHtml: customBuildDeckSourceHtml
  });

  assert.equal(result, '<html>source-from-shared-deck-view-helper</html>');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.buildSharedHtml, customBuildStudioSourceHtml);
  assert.equal(
    delegatedArgs.options.buildCanonicalHtml(canonicalDeck, deckHtmlOptions),
    JSON.stringify([canonicalDeck, deckHtmlOptions])
  );
});

test('buildEditorSourceHtml prefers the live active slide when the editor frame is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioLiveActiveSlide(nextDoc) {
        return nextDoc && nextDoc.querySelector('.slide-active');
      },
      resolveStudioLiveActiveSlideId(nextDoc, options) {
        return nextDoc && nextDoc.querySelector('.slide-active') && options.getActiveSlideId(nextDoc);
      },
      buildStudioSourceHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>source</html>';
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when source html renders from the canonical deck');
    },
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return nextDoc.querySelector('.slide-active');
    },
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

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  const result = context.buildEditorSourceHtml();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, iframeDoc);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.activeSlideId, 'slide-2');
  assert.equal(result, '<html>source</html>');
});

test('buildEditorSourceHtml reuses the resolved live canonical deck when source generation falls back', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState,
      resolveStudioLiveActiveSlide(nextDoc) {
        return nextDoc.querySelector('.slide-active');
      },
      resolveStudioLiveActiveSlideId(nextDoc, options) {
        return nextDoc && nextDoc.querySelector('.slide-active') && options.getActiveSlideId(nextDoc);
      },
      buildStudioSourceHtml(doc, options) {
        assert.equal(options.buildCanonicalDeck(doc), canonicalDeck);
        return options.buildFallbackHtml(doc);
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
    buildPersistableDeckHtml(nextDoc, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return '<html>persisted-source</html>';
    },
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return nextDoc.querySelector('.slide-active');
    },
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

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  assert.equal(context.buildEditorSourceHtml(), '<html>persisted-source</html>');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorSourceHtml falls back to the current session slide when live active slide state is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSourceHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function launchPresentationHtml(html, startSlideIdx) {'
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
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver,
      createStudioDeckRenderOptions: deckView.createStudioDeckRenderOptions,
      resolveStudioCanonicalDeckViewState: deckView.resolveStudioCanonicalDeckViewState,
      buildStudioSourceHtml(doc, options) {
        assert.equal(options.buildCanonicalDeck(doc), canonicalDeck);
        return options.deckHtmlOptions.renderOptions.activeSlideId;
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
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when source html resolves through the canonical deck');
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return nextDoc.querySelector('.slide-active');
    },
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

  attachDeckViewHtmlOptions(context);
  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  assert.equal(context.buildEditorSourceHtml(), 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});
