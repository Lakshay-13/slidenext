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
  const context = {
    SlideNextStudioDeckView: {
      buildStudioPreviewHtml(doc, options) {
        calls.push({ doc, options });
        return options.buildFallbackHtml(null);
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
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
  assert.equal(calls[0].options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.activeSlideId, 'slide-2');
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0].options.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(result, '<html>persisted-preview</html>');
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
  const iframeDoc = { label: 'iframe-doc' };
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
