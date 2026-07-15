const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const preview = require('../shared/studio-preview.js');
const deckView = require('../shared/studio-deck-view.js');

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

  let buildEditorSourceHtmlCalls = 0;
  const previewOpenCalls = [];
  const context = {
    resolveCurrentStudioDeckReadyActionState() {
      return {
        canUseDeckActions: false
      };
    },
    SlideNextStudioPreview: {
      openStudioSourceView(options = {}) {
        previewOpenCalls.push(options);
        return true;
      }
    },
    buildEditorSourceHtml() {
      buildEditorSourceHtmlCalls += 1;
      return '<html>source</html>';
    },
    document: {
      getElementById(id) {
        switch (id) {
          case 'openSourceViewBtn':
            return { disabled: true };
          case 'sourceViewModal':
            return { classList: createClassList(['hidden']) };
          case 'sourceViewModalContent':
            return { classList: createClassList(['scale-95']) };
          case 'sourceViewContent':
            return { value: '' };
          default:
            return null;
        }
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(openSourceViewModalSource, context);

  context.openSourceViewModal();

  assert.equal(previewOpenCalls.length, 1);
  assert.equal(previewOpenCalls[0].canOpenSourceView, false);
  assert.equal(previewOpenCalls[0].document, context.document);
  assert.equal(typeof previewOpenCalls[0].resolveSourceHtml, 'function');
  assert.equal(buildEditorSourceHtmlCalls, 0);
  assert.equal(previewOpenCalls[0].resolveSourceHtml(), '<html>source</html>');
  assert.equal(buildEditorSourceHtmlCalls, 1);
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

test('buildEditorSourceHtml falls back to the shared deck html source builder when the deck view helper is unavailable', () => {
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
  const context = {
    SlideNextStudioDeckView: {
      createStudioCanonicalDeckResolver: deckView.createStudioCanonicalDeckResolver
    },
    SlideNextDeckHtml: {
      buildDeckSourceHtml(nextCanonicalDeck, options) {
        calls.push({ nextCanonicalDeck, options });
        return '<html>source-from-deck-html</html>';
      }
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

  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  const result = context.buildEditorSourceHtml();

  assert.equal(result, '<html>source-from-deck-html</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextCanonicalDeck, canonicalDeck);
  assert.equal(calls[0].options.renderOptions.activeSlideId, 'slide-2');
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
      buildStudioDeckHtml(doc, options) {
        calls.push({ doc, options });
        return '<html>source-from-deck-view-html</html>';
      }
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
      buildStudioSourceHtml() {
        throw new Error('default studio source html builder should not run');
      }
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
      buildStudioSourceHtml(doc, options) {
        assert.equal(options.buildCanonicalDeck(doc), canonicalDeck);
        return options.deckHtmlOptions.renderOptions.activeSlideId;
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

  vm.createContext(context);
  vm.runInContext(buildEditorSourceHtmlSource, context);

  assert.equal(context.buildEditorSourceHtml(), 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});
