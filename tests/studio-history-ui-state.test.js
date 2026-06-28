const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('createHistoryEntry attaches the current canonical deck sidecar to editor history entries', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function normalizeHistoryEntry(entry) {'
  );

  const iframeDoc = { id: 'doc' };
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const calls = [];
  const context = {
    buildEditorCanonicalDeck(doc) {
      calls.push(['buildEditorCanonicalDeck', doc]);
      return canonicalDeck;
    },
    buildHistoryFrameHtml() {},
    getPersistedActiveSlideId() {
      return '';
    },
    persistedDeckPlaybackState: null,
    getEditorHistoryOptions() {
      calls.push(['getEditorHistoryOptions']);
      return { chromeNodeIds: ['editorSelectionOverlay'] };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    SlideNextStudioHistory: {
      createStudioHistoryEntry(doc, options) {
        calls.push(['createStudioHistoryEntry', doc, options]);
        return { html: '<html></html>', canonicalDeck: options.canonicalDeck };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(createHistoryEntrySource, context);

  const entry = context.createHistoryEntry();

  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getEditorHistoryOptions',
    'buildEditorCanonicalDeck',
    'createStudioHistoryEntry'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[3][2].buildHistoryHtml, context.buildHistoryFrameHtml);
  assert.equal(calls[3][2].canonicalDeck, canonicalDeck);
  assert.deepEqual(entry, {
    html: '<html></html>',
    canonicalDeck
  });
});

test('createHistoryEntry falls back to persisted baseline state when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc()) {',
    '\n\n    function createHistoryEntry(doc) {'
  );
  const createHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function normalizeHistoryEntry(entry) {'
  );

  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [{ id: 'slide-1', nodes: [] }] };
  const calls = [];
  const context = {
    SlideNextStudioHistory: {
      buildStudioHistoryFrameHtml(doc, options) {
        calls.push(['buildStudioHistoryFrameHtml', doc, options]);
        return '';
      },
      createStudioHistoryEntry(doc, options) {
        calls.push(['createStudioHistoryEntry', doc, options]);
        return {
          html: options.buildHistoryHtml(doc, options),
          activeSlideId: options.activeSlideId,
          selectedElementIds: options.selectedElementIds,
          canonicalDeck: options.canonicalDeck
        };
      }
    },
    buildEditorCanonicalDeck(doc) {
      calls.push(['buildEditorCanonicalDeck', doc]);
      return canonicalDeck;
    },
    buildPersistableDeckHtml(doc) {
      calls.push(['buildPersistableDeckHtml', doc]);
      return '<html>persisted-baseline</html>';
    },
    getPersistedActiveSlideId() {
      calls.push(['getPersistedActiveSlideId']);
      return 'slide-1';
    },
    getEditorHistoryOptions() {
      calls.push(['getEditorHistoryOptions']);
      return { chromeNodeIds: ['editorSelectionOverlay'] };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-1']
    }
  };

  vm.createContext(context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);
  vm.runInContext(createHistoryEntrySource, context);

  const entry = context.createHistoryEntry();

  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getEditorHistoryOptions',
    'getPersistedActiveSlideId',
    'buildEditorCanonicalDeck',
    'createStudioHistoryEntry',
    'getEditorHistoryOptions',
    'buildStudioHistoryFrameHtml',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[3][1], null);
  assert.equal(calls[4][1], null);
  assert.equal(calls[4][2].activeSlideId, 'slide-1');
  assert.equal(Array.isArray(calls[4][2].selectedElementIds), true);
  assert.equal(calls[4][2].selectedElementIds.length, 0);
  assert.equal(calls[7][1], null);
  assert.equal(entry.html, '<html>persisted-baseline</html>');
  assert.equal(entry.activeSlideId, 'slide-1');
  assert.equal(Array.isArray(entry.selectedElementIds), true);
  assert.equal(entry.selectedElementIds.length, 0);
  assert.equal(entry.canonicalDeck, canonicalDeck);
});

test('captureState reads the live frame through the shared iframe accessor before updating history state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  const historyEntry = { html: '<html></html>' };
  const capturedCalls = [];
  const context = {
    createHistoryEntry(doc) {
      capturedCalls.push(['createHistoryEntry', doc]);
      return historyEntry;
    },
    getEditorHistoryStackOptions() {
      capturedCalls.push(['getEditorHistoryStackOptions']);
      return { limit: 50 };
    },
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      captureStudioHistoryState(undoStack, redoStack, nextHistoryEntry, options) {
        capturedCalls.push(['captureStudioHistoryState', undoStack, redoStack, nextHistoryEntry, options]);
        return {
          didCapture: true,
          undoStack: ['undo-entry'],
          redoStack: []
        };
      }
    },
    undoStack: [],
    updateHistoryButtons() {
      capturedCalls.push(['updateHistoryButtons']);
    }
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  context.captureState();

  assert.equal(context.undoStack.length, 1);
  assert.equal(context.undoStack[0], 'undo-entry');
  assert.equal(context.redoStack.length, 0);
  assert.deepEqual(capturedCalls, [
    ['createHistoryEntry', undefined],
    ['getEditorHistoryStackOptions'],
    ['captureStudioHistoryState', [], ['redo-entry'], historyEntry, { limit: 50 }],
    ['updateHistoryButtons']
  ]);
});

test('captureState skips history capture when no history entry can be created', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  let createHistoryEntryCalls = 0;
  const context = {
    createHistoryEntry() {
      createHistoryEntryCalls += 1;
      return null;
    },
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      captureStudioHistoryState() {
        throw new Error('captureStudioHistoryState should not run without a history entry');
      }
    },
    undoStack: ['undo-entry'],
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should not run without a history entry');
    }
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  context.captureState();

  assert.equal(createHistoryEntryCalls, 1);
  assert.deepEqual(context.undoStack, ['undo-entry']);
  assert.deepEqual(context.redoStack, ['redo-entry']);
});

test('captureState can store a persisted baseline history entry without a live frame document', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  const historyEntry = {
    html: '<html>persisted-baseline</html>',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [{ id: 'slide-1', nodes: [] }] }
  };
  const capturedCalls = [];
  const context = {
    createHistoryEntry() {
      capturedCalls.push(['createHistoryEntry']);
      return historyEntry;
    },
    getEditorHistoryStackOptions() {
      capturedCalls.push(['getEditorHistoryStackOptions']);
      return { limit: 50 };
    },
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      captureStudioHistoryState(undoStack, redoStack, nextHistoryEntry, options) {
        capturedCalls.push(['captureStudioHistoryState', undoStack, redoStack, nextHistoryEntry, options]);
        return {
          didCapture: true,
          undoStack: ['undo-entry'],
          redoStack: []
        };
      }
    },
    undoStack: [],
    updateHistoryButtons() {
      capturedCalls.push(['updateHistoryButtons']);
    }
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  context.captureState();

  assert.equal(context.undoStack.length, 1);
  assert.equal(context.undoStack[0], 'undo-entry');
  assert.equal(context.redoStack.length, 0);
  assert.deepEqual(capturedCalls, [
    ['createHistoryEntry'],
    ['getEditorHistoryStackOptions'],
    ['captureStudioHistoryState', [], ['redo-entry'], historyEntry, { limit: 50 }],
    ['updateHistoryButtons']
  ]);
});

test('restoreFrameFromHistoryEntry threads the shared iframe accessor through history restore callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreFrameFromHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function restoreFrameFromHistoryEntry(entry) {',
    '\n\n    function buildPersistableDeckHtml('
  );

  const iframeDoc = {
    documentElement: {
      innerHTML: ''
    }
  };
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const callLog = [];
  const context = {
    applyEditorSelectionState(selection) {
      callLog.push(['applyEditorSelectionState', selection]);
    },
    bindDeckNavigationSync(doc) {
      callLog.push(['bindDeckNavigationSync', doc]);
    },
    currentSlideIndex: 2,
    generateThumbnails() {
      callLog.push(['generateThumbnails']);
    },
    getIframeDoc() {
      callLog.push(['getIframeDoc']);
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      callLog.push(['getPersistedActiveSlideId']);
      return 'slide-3';
    },
    getSlides(doc) {
      callLog.push(['getSlides', doc]);
      return [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }];
    },
    makeElementsHoverable(doc) {
      callLog.push(['makeElementsHoverable', doc]);
    },
    normalizeHistoryEntry(entry) {
      callLog.push(['normalizeHistoryEntry', entry]);
      return {
        ...entry,
        normalized: true
      };
    },
    observeDeckActiveSlideState(doc) {
      callLog.push(['observeDeckActiveSlideState', doc]);
    },
    restoreCommittedSelectionByIdsOnActiveSlide(selectedElementIds, doc) {
      callLog.push(['restoreCommittedSelectionByIdsOnActiveSlide', selectedElementIds, doc]);
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck) {
      callLog.push(['setCurrentPresentationCanonicalDeck', nextCanonicalDeck]);
    },
    setActiveSlide(index) {
      callLog.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc) {
      callLog.push(['setActiveSlideById', slideId, doc]);
    },
    setupIframeDragging(doc) {
      callLog.push(['setupIframeDragging', doc]);
    },
    SlideNextStudioHistory: {
      restoreStudioHistoryActiveSlide(nextHistoryEntry, options) {
        callLog.push(['restoreStudioHistoryActiveSlide', nextHistoryEntry, options.fallbackIndex]);
        options.restoreActiveSlideById('slide-2');
        callLog.push(['getSlideCountResult', options.getSlideCount()]);
        options.setActiveSlideByIndex(1);
      },
      restoreStudioHistoryEntry(nextHistoryEntry, options) {
        callLog.push(['restoreStudioHistoryEntry', nextHistoryEntry]);
        options.restoreFrameSetup(nextHistoryEntry);
        options.restoreActiveSlide(nextHistoryEntry);
        options.restoreSelectionState(nextHistoryEntry);
      },
      restoreStudioHistoryFrameSetup(nextHistoryEntry, options) {
        callLog.push(['restoreStudioHistoryFrameSetup', nextHistoryEntry, options.doc, options.deckHtmlOptions]);
        options.replaceFrameHtml(options.doc, '<html>restored</html>');
        options.syncIframeTheme();
        options.makeElementsHoverable(options.doc);
        options.setupIframeDragging(options.doc);
        options.bindDeckNavigationSync(options.doc);
        options.generateThumbnails();
      },
      restoreStudioHistorySelectionState(nextHistoryEntry, options) {
        callLog.push(['restoreStudioHistorySelectionState', nextHistoryEntry, options.doc]);
        options.restoreCommittedSelectionState(['node-1'], options.doc);
        options.observeDeckActiveSlideState(options.doc);
      }
    },
    syncIframeTheme() {
      callLog.push(['syncIframeTheme']);
    }
  };

  vm.createContext(context);
  vm.runInContext(restoreFrameFromHistoryEntrySource, context);

  context.restoreFrameFromHistoryEntry({
    html: '<html>snapshot</html>',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });

  assert.equal(iframeDoc.documentElement.innerHTML, '<html>restored</html>');
  assert.equal(callLog[0][0], 'getIframeDoc');
  assert.equal(callLog[1][0], 'normalizeHistoryEntry');
  assert.equal(callLog[1][1].html, '<html>snapshot</html>');
  assert.deepEqual(callLog[1][1].selectedElementIds, ['node-1']);
  assert.equal(callLog[2][0], 'applyEditorSelectionState');
  assert.equal(Object.keys(callLog[2][1]).length, 0);
  assert.equal(callLog[3][0], 'restoreStudioHistoryEntry');
  assert.equal(callLog[3][1].normalized, true);
  assert.equal(callLog[4][0], 'getPersistedActiveSlideId');
  assert.equal(callLog[5][0], 'restoreStudioHistoryFrameSetup');
  assert.equal(callLog[5][2], iframeDoc);
  assert.equal(callLog[5][3].renderOptions.activeSlideId, 'slide-3');
  assert.equal(callLog[5][3].renderOptions.preferSourceHtml, false);
  assert.equal(callLog[5][3].renderOptions.preferBodySourceHtml, false);
  assert.equal(callLog[5][3].renderOptions.preferSlideSourceHtml, false);
  assert.equal(callLog[6][0], 'syncIframeTheme');
  assert.equal(callLog[7][0], 'makeElementsHoverable');
  assert.equal(callLog[7][1], iframeDoc);
  assert.equal(callLog[8][0], 'setupIframeDragging');
  assert.equal(callLog[8][1], iframeDoc);
  assert.equal(callLog[9][0], 'bindDeckNavigationSync');
  assert.equal(callLog[9][1], iframeDoc);
  assert.equal(callLog[10][0], 'generateThumbnails');
  assert.equal(callLog[11][0], 'restoreStudioHistoryActiveSlide');
  assert.equal(callLog[11][2], 2);
  assert.deepEqual(callLog[12], ['setActiveSlideById', 'slide-2', iframeDoc]);
  assert.deepEqual(callLog[13], ['getSlides', iframeDoc]);
  assert.deepEqual(callLog[14], ['getSlideCountResult', 3]);
  assert.deepEqual(callLog[15], ['setActiveSlide', 1]);
  assert.equal(callLog[16][0], 'restoreStudioHistorySelectionState');
  assert.equal(callLog[16][2], iframeDoc);
  assert.deepEqual(callLog[17], ['restoreCommittedSelectionByIdsOnActiveSlide', ['node-1'], iframeDoc]);
  assert.deepEqual(callLog[18], ['observeDeckActiveSlideState', iframeDoc]);
  assert.deepEqual(callLog[19], ['setCurrentPresentationCanonicalDeck', canonicalDeck]);
});
