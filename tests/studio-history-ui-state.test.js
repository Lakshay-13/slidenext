const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioHistory = require('../shared/studio-history.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('updateHistoryButtons tolerates missing history controls', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateHistoryButtonsSource = extractFunctionSource(
    fileContent,
    'function updateHistoryButtons() {',
    '\n\n    function editorUndo() {'
  );

  const calls = [];
  const context = {
    SlideNextStudioHistory: {
      getStudioHistoryButtonState(undoStack, redoStack) {
        calls.push(['getStudioHistoryButtonState', undoStack, redoStack]);
        return {
          undoDisabled: true,
          redoDisabled: false
        };
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    undoStack: ['entry-1'],
    redoStack: ['entry-2']
  };

  vm.createContext(context);
  vm.runInContext(updateHistoryButtonsSource, context);

  assert.doesNotThrow(() => context.updateHistoryButtons());
  assert.deepEqual(calls, [
    ['getStudioHistoryButtonState', ['entry-1'], ['entry-2']],
    ['getElementById', 'studioUndoBtn'],
    ['getElementById', 'studioRedoBtn']
  ]);
});

test('createHistoryEntry attaches the current canonical deck sidecar and live editor state to history entries', () => {
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
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-2';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return ['node-1', 'node-2'];
    },
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
        return {
          html: '<html></html>',
          activeSlideId: options.getActiveSlideId(doc),
          selectedElementIds: options.getSelectedElementIds(doc),
          canonicalDeck: options.canonicalDeck
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(createHistoryEntrySource, context);

  const entry = context.createHistoryEntry();

  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'buildEditorCanonicalDeck',
    'getEditorHistoryOptions',
    'createStudioHistoryEntry',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[3][2].buildHistoryHtml, context.buildHistoryFrameHtml);
  assert.equal(calls[3][2].canonicalDeck, canonicalDeck);
  assert.deepEqual(entry, {
    html: '<html></html>',
    activeSlideId: 'slide-2',
    selectedElementIds: ['node-1', 'node-2'],
    canonicalDeck
  });
});

test('createHistoryEntry captures a model-only history entry when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createHistoryEntry(doc) {'
  );
  const createHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function normalizeHistoryEntry(entry) {'
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
    getActiveSlideId() {
      throw new Error('getActiveSlideId should not run without a live editor frame');
    },
    getCommittedSelectedEditorElementIds() {
      throw new Error('getCommittedSelectedEditorElementIds should not run without a live editor frame');
    },
    buildEditorCanonicalDeck(doc) {
      calls.push(['buildEditorCanonicalDeck', doc]);
      return canonicalDeck;
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run without a live editor frame');
    },
    currentSlideIndex: 1,
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
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);
  vm.runInContext(createHistoryEntrySource, context);

  const entry = context.createHistoryEntry();

  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'buildEditorCanonicalDeck',
    'getEditorHistoryOptions',
    'getPersistedActiveSlideId',
    'createStudioHistoryEntry',
    'getEditorHistoryOptions',
    'buildStudioHistoryFrameHtml'
  ]);
  assert.equal(calls[1][1], null);
  assert.equal(calls[4][1], null);
  assert.equal(calls[4][2].activeSlideId, 'slide-2');
  assert.equal(Array.isArray(calls[4][2].selectedElementIds), true);
  assert.equal(calls[4][2].selectedElementIds.length, 0);
  assert.equal(entry.html, '');
  assert.equal(entry.activeSlideId, 'slide-2');
  assert.equal(Array.isArray(entry.selectedElementIds), true);
  assert.equal(entry.selectedElementIds.length, 0);
  assert.equal(entry.canonicalDeck, canonicalDeck);
});

test('buildHistoryFrameHtml reuses shared deck source sanitization for history snapshots', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const getEditorHistoryOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorHistoryOptions(options = {}) {',
    '\n\n    function getEditorHistoryStackOptions(options = {}) {'
  );
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createHistoryEntry(doc) {'
  );

  function createSerializableNode(tagName, attributes = {}, classes = [], children = [], textContent = '') {
    const state = {
      removed: false,
      attributes: { ...attributes },
      classes: new Set(classes),
      children: [...children],
      textContent
    };

    return {
      classList: {
        remove(className) {
          state.classes.delete(className);
        }
      },
      remove() {
        state.removed = true;
      },
      removeAttribute(name) {
        delete state.attributes[name];
      },
      serialize() {
        if (state.removed) return '';
        const classNames = Array.from(state.classes);
        const attributeEntries = Object.entries(state.attributes);
        if (classNames.length > 0) {
          attributeEntries.unshift(['class', classNames.join(' ')]);
        }
        const attributeText = attributeEntries
          .map(([name, value]) => ` ${name}="${value}"`)
          .join('');
        const childHtml = state.children.map((child) => child.serialize()).join('');
        return `<${tagName}${attributeText}>${state.textContent}${childHtml}</${tagName}>`;
      }
    };
  }

  const styleNode = createSerializableNode('style', { id: 'editor-style-tag' }, [], [], '.editor { color: red; }');
  const themeOverrideNode = createSerializableNode('style', { id: 'editor-theme-override-tag' }, [], [], '.theme { color: blue; }');
  const runtimeNode = createSerializableNode(
    'div',
    { 'data-editor-id': 'node-1' },
    ['editor-hoverable'],
    [],
    'Hero copy'
  );
  const slideNode = createSerializableNode(
    'section',
    { 'data-slide-id': 'slide-runtime-1' },
    ['slide', 'editor-selected'],
    [runtimeNode]
  );
  const overlayNode = createSerializableNode('div', { id: 'editorSelectionOverlay' });
  const clone = {
    querySelectorAll(selector) {
      switch (selector) {
        case '#editorSelectionOverlay':
          return [overlayNode];
        case '#editor-style-tag':
          return [styleNode];
        case '#editor-theme-override-tag':
          return [themeOverrideNode];
        case '.editor-selected':
          return [slideNode];
        case '.editor-hoverable':
          return [runtimeNode];
        case '[data-editor-id]':
          return [runtimeNode];
        case '[data-slide-id]':
          return [slideNode];
        default:
          return [];
      }
    },
    get innerHTML() {
      return styleNode.serialize() + themeOverrideNode.serialize() + slideNode.serialize() + overlayNode.serialize();
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return clone;
      }
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioHistory: studioHistory,
    SlideNextDeckImport: {
      sanitizeDeckSourceClone(root, options) {
        calls.push(['sanitizeDeckSourceClone', root, options]);
        options.ignoredNodeIds.forEach((nodeId) => {
          root.querySelectorAll(`#${nodeId}`).forEach((node) => node.remove());
        });
      }
    },
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedEditorElementIds() {
      return [];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when history html is captured from the live frame');
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);

  const html = context.buildHistoryFrameHtml(doc);

  assert.equal(html, '<section class="slide"><div>Hero copy</div></section>');
  assert.deepEqual(calls.map(([name]) => name), ['sanitizeDeckSourceClone']);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0][2].ignoredNodeIds)),
    ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0][2].transientClassNames)),
    ['editor-selected', 'editor-hoverable', 'editor-dragging']
  );
  assert.equal(calls[0][2].editorElementIdAttr, 'data-editor-id');
  assert.equal(calls[0][2].editorSlideIdAttr, 'data-slide-id');
});

test('buildHistoryFrameHtml strips editor style tags when the shared deck source sanitizer is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const getEditorHistoryOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorHistoryOptions(options = {}) {',
    '\n\n    function getEditorHistoryStackOptions(options = {}) {'
  );
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createHistoryEntry(doc) {'
  );

  function createSerializableNode(tagName, attributes = {}, classes = [], children = [], textContent = '') {
    const state = {
      removed: false,
      attributes: { ...attributes },
      classes: new Set(classes),
      children: [...children],
      textContent
    };

    return {
      classList: {
        remove(className) {
          state.classes.delete(className);
        }
      },
      remove() {
        state.removed = true;
      },
      removeAttribute(name) {
        delete state.attributes[name];
      },
      serialize() {
        if (state.removed) return '';
        const classNames = Array.from(state.classes);
        const attributeEntries = Object.entries(state.attributes);
        if (classNames.length > 0) {
          attributeEntries.unshift(['class', classNames.join(' ')]);
        }
        const attributeText = attributeEntries
          .map(([name, value]) => ` ${name}="${value}"`)
          .join('');
        const childHtml = state.children.map((child) => child.serialize()).join('');
        return `<${tagName}${attributeText}>${state.textContent}${childHtml}</${tagName}>`;
      }
    };
  }

  const styleNode = createSerializableNode('style', { id: 'editor-style-tag' }, [], [], '.editor { color: red; }');
  const themeOverrideNode = createSerializableNode('style', { id: 'editor-theme-override-tag' }, [], [], '.theme { color: blue; }');
  const runtimeNode = createSerializableNode(
    'div',
    { 'data-editor-id': 'node-1' },
    ['editor-hoverable'],
    [],
    'Hero copy'
  );
  const slideNode = createSerializableNode(
    'section',
    { 'data-slide-id': 'slide-runtime-1' },
    ['slide', 'editor-selected'],
    [runtimeNode]
  );
  const overlayNode = createSerializableNode('div', { id: 'editorSelectionOverlay' });
  const clone = {
    querySelectorAll(selector) {
      switch (selector) {
        case '#editor-style-tag':
          return [styleNode];
        case '#editor-theme-override-tag':
          return [themeOverrideNode];
        case '#editorSelectionOverlay':
          return [overlayNode];
        case '.editor-selected':
          return [slideNode];
        case '.editor-hoverable':
          return [runtimeNode];
        case '[data-editor-id]':
          return [runtimeNode];
        case '[data-slide-id]':
          return [slideNode];
        default:
          return [];
      }
    },
    get innerHTML() {
      return styleNode.serialize() + themeOverrideNode.serialize() + slideNode.serialize() + overlayNode.serialize();
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return clone;
      }
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioHistory: studioHistory,
    SlideNextDeckPersistence: {
      stripTransientDeckRuntimeState(root) {
        calls.push(['stripTransientDeckRuntimeState', root]);
      }
    },
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedEditorElementIds() {
      return [];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when history html is captured from the live frame');
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);

  const html = context.buildHistoryFrameHtml(doc);

  assert.equal(html, '<section class="slide"><div>Hero copy</div></section>');
  assert.deepEqual(calls.map(([name]) => name), ['stripTransientDeckRuntimeState']);
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

test('applyCurrentStudioRestoredHistoryState updates the playback baseline and live canonical deck together', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function applyCurrentStudioPersistedCanonicalDeck('
  );
  const playbackHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedPlaybackState(playbackState = null) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioRestoredHistoryState(historyEntry = {}, playbackState = null) {',
    '\n\n    function restoreFrameFromHistoryEntry(entry) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  const callLog = [];
  const context = {
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck) {
      callLog.push(['setCurrentPresentationCanonicalDeck', nextCanonicalDeck]);
    },
    updateEditorPersistedDeckState(nextState) {
      callLog.push(['updateEditorPersistedDeckState', nextState]);
    }
  };

  vm.createContext(context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(playbackHelperSource, context);
  vm.runInContext(helperSource, context);

  context.applyCurrentStudioRestoredHistoryState({ canonicalDeck }, playbackState);
  context.applyCurrentStudioRestoredHistoryState({}, null);

  assert.deepEqual(
    JSON.parse(JSON.stringify(callLog)),
    [
      ['updateEditorPersistedDeckState', { playbackState }],
      ['setCurrentPresentationCanonicalDeck', canonicalDeck],
      ['updateEditorPersistedDeckState', { playbackState: null }],
      ['setCurrentPresentationCanonicalDeck', null]
    ]
  );
});

test('restoreFrameFromHistoryEntry threads the shared iframe accessor through history restore callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function applyCurrentStudioPersistedCanonicalDeck('
  );
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
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] },
      { id: 'slide-3', nodes: [] }
    ]
  };
  const callLog = [];
  const restoredPlaybackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  const context = {
    applyEditorSelectionState(selection) {
      callLog.push(['applyEditorSelectionState', selection]);
    },
    bindDeckNavigationSync(doc) {
      callLog.push(['bindDeckNavigationSync', doc]);
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      callLog.push(['capturePersistedDeckPlaybackState', doc, nextCanonicalDeck]);
      return restoredPlaybackState;
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
      return 'slide-1';
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
    },
    updateEditorPersistedDeckState(nextState) {
      callLog.push(['updateEditorPersistedDeckState', nextState]);
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(
    extractFunctionSource(
      fileContent,
      'function applyCurrentStudioPersistedPlaybackState(playbackState = null) {',
      '\n\n    function setCurrentPresentationCanonicalDeck('
    ),
    context
  );
  vm.runInContext(
    extractFunctionSource(
      fileContent,
      'function applyCurrentStudioRestoredHistoryState(historyEntry = {}, playbackState = null) {',
      '\n\n    function restoreFrameFromHistoryEntry(entry) {'
    ),
    context
  );
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
  assert.equal(callLog[5][3].renderOptions.preferHeadSourceHtml, false);
  assert.equal(callLog[5][3].renderOptions.preferBodySourceHtml, false);
  assert.equal(callLog[5][3].renderOptions.preferSlideSourceHtml, false);
  assert.equal(callLog[5][3].renderOptions.preferNodeSourceHtml, false);
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
  assert.deepEqual(callLog[19], ['capturePersistedDeckPlaybackState', iframeDoc, canonicalDeck]);
  assert.equal(callLog[20][0], 'updateEditorPersistedDeckState');
  assert.deepEqual(
    JSON.parse(JSON.stringify(callLog[20][1])),
    { playbackState: restoredPlaybackState }
  );
  assert.deepEqual(callLog[21], ['setCurrentPresentationCanonicalDeck', canonicalDeck]);
});

test('restoreFrameFromHistoryEntry clears stale persisted playback state when the restored frame has no playback markers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function applyCurrentStudioPersistedCanonicalDeck('
  );
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
  const callLog = [];
  const context = {
    applyEditorSelectionState() {},
    bindDeckNavigationSync() {},
    buildEditorCanonicalDeck() {
      return null;
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      callLog.push(['capturePersistedDeckPlaybackState', doc, nextCanonicalDeck]);
      return null;
    },
    currentSlideIndex: 0,
    generateThumbnails() {},
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return '';
    },
    getSlides() {
      return [];
    },
    makeElementsHoverable() {},
    normalizeHistoryEntry(entry) {
      return entry;
    },
    observeDeckActiveSlideState() {},
    restoreCommittedSelectionByIdsOnActiveSlide() {},
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck) {
      callLog.push(['setCurrentPresentationCanonicalDeck', nextCanonicalDeck]);
    },
    setActiveSlide() {},
    setActiveSlideById() {},
    setupIframeDragging() {},
    SlideNextStudioHistory: {
      restoreStudioHistoryActiveSlide() {},
      restoreStudioHistoryEntry(nextHistoryEntry, options) {
        options.restoreFrameSetup(nextHistoryEntry);
        options.restoreActiveSlide(nextHistoryEntry);
        options.restoreSelectionState(nextHistoryEntry);
      },
      restoreStudioHistoryFrameSetup(nextHistoryEntry, options) {
        options.replaceFrameHtml(options.doc, '<html>restored</html>');
      },
      restoreStudioHistorySelectionState() {}
    },
    syncIframeTheme() {},
    updateEditorPersistedDeckState(nextState) {
      callLog.push(['updateEditorPersistedDeckState', nextState]);
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(
    extractFunctionSource(
      fileContent,
      'function applyCurrentStudioPersistedPlaybackState(playbackState = null) {',
      '\n\n    function setCurrentPresentationCanonicalDeck('
    ),
    context
  );
  vm.runInContext(
    extractFunctionSource(
      fileContent,
      'function applyCurrentStudioRestoredHistoryState(historyEntry = {}, playbackState = null) {',
      '\n\n    function restoreFrameFromHistoryEntry(entry) {'
    ),
    context
  );
  vm.runInContext(restoreFrameFromHistoryEntrySource, context);

  context.restoreFrameFromHistoryEntry({
    html: '<html>snapshot</html>',
    canonicalDeck: null
  });

  assert.deepEqual(callLog[0], ['capturePersistedDeckPlaybackState', iframeDoc, null]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(callLog[1])),
    ['updateEditorPersistedDeckState', { playbackState: null }]
  );
  assert.deepEqual(callLog[2], ['setCurrentPresentationCanonicalDeck', null]);
});
