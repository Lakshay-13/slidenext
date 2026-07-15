const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioHistory = require('../shared/studio-history.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadSaveHistoryState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function saveHistoryState(debounce = false, transaction = null) {',
    '\n\n    function buildHistoryFrameHtml('
  );
  context.SlideNextStudioHistory = {
    ...studioHistory,
    ...(context.SlideNextStudioHistory || {})
  };
  vm.runInContext(helperSource, context);
}

function loadResolveEditorMetadataPersistenceOptions(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= studioPersistence;
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
  );
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
}

test('updateHistoryButtons delegates editor control rendering to shared history state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateHistoryButtonsSource = extractFunctionSource(
    fileContent,
    'function updateHistoryButtons() {',
    '\n\n    function editorUndo() {'
  );

  let delegatedArgs = null;
  const context = {
    SlideNextStudioHistory: {
      syncStudioHistoryButtons(options) {
        delegatedArgs = options;
        return {
          undoDisabled: true,
          redoDisabled: false
        };
      }
    },
    document: {
      getElementById() { return null; }
    },
    undoStack: ['entry-1'],
    redoStack: ['entry-2']
  };

  vm.createContext(context);
  vm.runInContext(updateHistoryButtonsSource, context);

  assert.deepEqual(context.updateHistoryButtons(), {
    undoDisabled: true,
    redoDisabled: false
  });
  assert.equal(delegatedArgs.documentRef, context.document);
  assert.deepEqual(delegatedArgs.undoStack, ['entry-1']);
  assert.deepEqual(delegatedArgs.redoStack, ['entry-2']);
});

test('updateHistoryButtons returns false when the shared history state is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateHistoryButtonsSource = extractFunctionSource(
    fileContent,
    'function updateHistoryButtons() {',
    '\n\n    function editorUndo() {'
  );

  const context = {
    SlideNextStudioHistory: {},
    document: {
      getElementById(id) {
        return { id, disabled: null };
      }
    },
    undoStack: ['entry-1'],
    redoStack: ['entry-2']
  };

  vm.createContext(context);
  vm.runInContext(updateHistoryButtonsSource, context);

  assert.equal(context.updateHistoryButtons(), false);
});

test('editorUndo reuses the shared history step runner when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editorUndoSource = extractFunctionSource(
    fileContent,
    'function editorUndo() {',
    '\n\n    function editorRedo() {'
  );

  const stepResult = {
    didUndo: true,
    undoStack: ['undo-next'],
    redoStack: [],
    restoreEntry: { html: '<html></html>' }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioHistory: {
      stepStudioHistoryUndo() {},
      createStudioHistoryStepRunner(options = {}) {
        delegatedArgs = options;
        return () => stepResult;
      }
    },
    redoStack: ['redo-entry'],
    restoreFrameFromHistoryEntry() {
      throw new Error('restoreFrameFromHistoryEntry should be delegated through the shared runner');
    },
    triggerAutoSave() {
      throw new Error('triggerAutoSave should be delegated through the shared runner');
    },
    undoStack: ['undo-entry'],
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should be delegated through the shared runner');
    }
  };

  vm.createContext(context);
  vm.runInContext(editorUndoSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.editorUndo())),
    stepResult
  );
  assert.equal(delegatedArgs.stepHistory, context.SlideNextStudioHistory.stepStudioHistoryUndo);
  assert.equal(delegatedArgs.didStepKey, 'didUndo');
  assert.equal(typeof delegatedArgs.getUndoStack, 'function');
  assert.equal(typeof delegatedArgs.getRedoStack, 'function');
  assert.equal(typeof delegatedArgs.setUndoStack, 'function');
  assert.equal(typeof delegatedArgs.setRedoStack, 'function');
  assert.equal(delegatedArgs.restoreHistoryEntry, context.restoreFrameFromHistoryEntry);
  assert.equal(delegatedArgs.updateHistoryButtons, context.updateHistoryButtons);
  assert.equal(delegatedArgs.triggerAutoSave, context.triggerAutoSave);
});

test('editorRedo reuses the shared history step runner when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editorRedoSource = extractFunctionSource(
    fileContent,
    'function editorRedo() {',
    '\n\n    function restoreFrameFromHistoryEntry(entry) {'
  );

  const stepResult = {
    didRedo: true,
    undoStack: ['undo-next'],
    redoStack: [],
    restoreEntry: { html: '<html></html>' }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioHistory: {
      stepStudioHistoryRedo() {},
      createStudioHistoryStepRunner(options = {}) {
        delegatedArgs = options;
        return () => stepResult;
      }
    },
    redoStack: ['redo-entry'],
    restoreFrameFromHistoryEntry() {
      throw new Error('restoreFrameFromHistoryEntry should be delegated through the shared runner');
    },
    triggerAutoSave() {
      throw new Error('triggerAutoSave should be delegated through the shared runner');
    },
    undoStack: ['undo-entry'],
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should be delegated through the shared runner');
    }
  };

  vm.createContext(context);
  vm.runInContext(editorRedoSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.editorRedo())),
    stepResult
  );
  assert.equal(delegatedArgs.stepHistory, context.SlideNextStudioHistory.stepStudioHistoryRedo);
  assert.equal(delegatedArgs.didStepKey, 'didRedo');
  assert.equal(typeof delegatedArgs.getUndoStack, 'function');
  assert.equal(typeof delegatedArgs.getRedoStack, 'function');
  assert.equal(typeof delegatedArgs.setUndoStack, 'function');
  assert.equal(typeof delegatedArgs.setRedoStack, 'function');
  assert.equal(delegatedArgs.restoreHistoryEntry, context.restoreFrameFromHistoryEntry);
  assert.equal(delegatedArgs.updateHistoryButtons, context.updateHistoryButtons);
  assert.equal(delegatedArgs.triggerAutoSave, context.triggerAutoSave);
});

test('createHistoryEntry attaches the current canonical deck sidecar and live editor state to history entries', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function updateEditorPersistedDeckState(nextState = {}) {'
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
    '\n\n    function updateEditorPersistedDeckState(nextState = {}) {'
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
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      calls.push(['resolveEditorFallbackCanonicalDeck', nextDoc, nextCanonicalDeck]);
      return nextCanonicalDeck;
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
    'resolveEditorFallbackCanonicalDeck',
    'createStudioHistoryEntry',
    'getEditorHistoryOptions',
    'buildStudioHistoryFrameHtml'
  ]);
  assert.equal(calls[1][1], null);
  assert.equal(calls[4][1], null);
  assert.equal(calls[5][1], null);
  assert.equal(calls[5][2].activeSlideId, 'slide-2');
  assert.equal(Array.isArray(calls[5][2].selectedElementIds), true);
  assert.equal(calls[5][2].selectedElementIds.length, 0);
  assert.equal(entry.html, '');
  assert.equal(entry.activeSlideId, 'slide-2');
  assert.equal(Array.isArray(entry.selectedElementIds), true);
  assert.equal(entry.selectedElementIds.length, 0);
  assert.equal(entry.canonicalDeck, canonicalDeck);
});

test('createHistoryEntry reuses the shared history entry builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function updateEditorPersistedDeckState(nextState = {}) {'
  );

  const resultEntry = {
    html: '<body><main>persisted</main></body>',
    activeSlideId: 'slide-2',
    selectedElementIds: ['node-1'],
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  };
  let delegatedArgs = null;
  const context = {
    buildEditorCanonicalDeck() {},
    buildHistoryFrameHtml() {},
    getActiveSlideId() {},
    getCommittedSelectedEditorElementIds() {},
    getEditorHistoryOptions() {},
    getIframeDoc() {},
    resolveEditorFallbackActiveSlideId() {},
    SlideNextStudioHistory: {
      buildStudioHistoryEntry(doc, options) {
        delegatedArgs = { doc, options };
        return resultEntry;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(createHistoryEntrySource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createHistoryEntry())),
    resultEntry
  );
  assert.equal(delegatedArgs.doc, undefined);
  assert.equal(delegatedArgs.options.getDocument, context.getIframeDoc);
  assert.equal(delegatedArgs.options.buildCanonicalDeck, context.buildEditorCanonicalDeck);
  assert.equal(delegatedArgs.options.getHistoryOptions, context.getEditorHistoryOptions);
  assert.equal(delegatedArgs.options.resolveFallbackActiveSlideId, context.resolveEditorFallbackActiveSlideId);
  assert.equal(delegatedArgs.options.buildHistoryHtml, context.buildHistoryFrameHtml);
  assert.equal(delegatedArgs.options.getActiveSlideId, context.getActiveSlideId);
  assert.equal(delegatedArgs.options.getSelectedElementIds, context.getCommittedSelectedEditorElementIds);
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
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        calls.push(['resolvePresentationPersistenceOptions', metadata]);
        assert.equal(metadata, context.currentPresentationMetadata);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    },
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
    currentPresentationMetadata: {
      id: 'computer-vision-presentation',
      persistence: {
        emptyContainerIds: ['pixelMatrix']
      }
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
  loadResolveEditorMetadataPersistenceOptions(fileContent, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);

  const html = context.buildHistoryFrameHtml(doc);

  assert.equal(html, '<section class="slide"><div>Hero copy</div></section>');
  assert.deepEqual(calls.map(([name]) => name), ['resolvePresentationPersistenceOptions', 'sanitizeDeckSourceClone']);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].ignoredNodeIds)),
    ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].transientClassNames)),
    ['editor-selected', 'editor-hoverable', 'editor-dragging']
  );
  assert.equal(calls[1][2].editorElementIdAttr, 'data-editor-id');
  assert.equal(calls[1][2].editorSlideIdAttr, 'data-slide-id');
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].persistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
});

test('getEditorHistoryOptions reuses the local metadata persistence resolver when available', () => {
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

  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckImport: {
      sanitizeDeckSourceClone(root, options) {
        calls.push(['sanitizeDeckSourceClone', root, options]);
      }
    },
    __resolveEditorMetadataPersistenceOptions(options = {}) {
      calls.push(['resolveEditorMetadataPersistenceOptions', options]);
      return {
        emptyContainerIds: ['pixelMatrix'],
        transientClassNames: ['revealed']
      };
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedEditorElementIds() {
      return [];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
  };
  const root = { label: 'frame-root' };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);

  const result = context.getEditorHistoryOptions({
    persistenceOptions: {
      transientClassNames: ['revealed']
    }
  });

  result.sanitizeFrameRoot(root);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls)),
    [
      [
        'resolveEditorMetadataPersistenceOptions',
        {
          persistenceOptions: {
            transientClassNames: ['revealed']
          }
        }
      ],
      [
        'sanitizeDeckSourceClone',
        root,
        {
          ignoredNodeIds: ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay'],
          transientClassNames: ['editor-selected', 'editor-hoverable', 'editor-dragging'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id',
          persistenceOptions: {
            emptyContainerIds: ['pixelMatrix'],
            transientClassNames: ['revealed']
          }
        }
      ]
    ]
  );
});

test('buildHistoryFrameHtml forwards sanitizer overrides into getEditorHistoryOptions', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createHistoryEntry(doc) {'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const sanitizer = () => {};
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioHistory: {
      buildStudioHistoryFrameHtml(nextDoc, options) {
        calls.push(['buildStudioHistoryFrameHtml', nextDoc, options]);
        return '<section>history</section>';
      }
    },
    getEditorHistoryOptions(options = {}) {
      calls.push(['getEditorHistoryOptions', options]);
      return {
        chromeNodeIds: options.chromeNodeIds || [],
        sanitizeFrameRoot: options.sanitizeFrameRoot || null
      };
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when history html serialization succeeds');
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);

  const html = context.buildHistoryFrameHtml(doc, {
    chromeNodeIds: ['editorHistoryOverlay'],
    sanitizeFrameRoot: sanitizer,
    canonicalDeck
  });

  assert.equal(html, '<section>history</section>');
  assert.deepEqual(calls, [
    ['getEditorHistoryOptions', {
      chromeNodeIds: ['editorHistoryOverlay'],
      sanitizeFrameRoot: sanitizer,
      canonicalDeck
    }],
    ['buildStudioHistoryFrameHtml', doc, {
      chromeNodeIds: ['editorHistoryOverlay'],
      sanitizeFrameRoot: sanitizer
    }]
  ]);
});

test('buildHistoryFrameHtml reuses the shared history capture helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildHistoryFrameHtmlSource = extractFunctionSource(
    fileContent,
    'function buildHistoryFrameHtml(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createHistoryEntry(doc) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    SlideNextStudioHistory: {
      buildStudioHistoryCaptureHtml(nextDoc, options) {
        calls.push(['buildStudioHistoryCaptureHtml', nextDoc, options]);
        return options.buildFallbackHtml(nextDoc, options);
      }
    },
    getEditorHistoryOptions(options = {}) {
      calls.push(['getEditorHistoryOptions', options]);
      return {
        chromeNodeIds: options.chromeNodeIds || []
      };
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      calls.push(['buildPersistableDeckHtml', nextDoc, options]);
      return '<html>persisted-history</html>';
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildHistoryFrameHtmlSource, context);

  const html = context.buildHistoryFrameHtml(doc, {
    chromeNodeIds: ['editorHistoryOverlay'],
    canonicalDeck
  });

  assert.equal(html, '<html>persisted-history</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'getEditorHistoryOptions',
    'buildStudioHistoryCaptureHtml',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], doc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].frameOptions)),
    { chromeNodeIds: ['editorHistoryOverlay'] }
  );
  assert.equal(calls[1][2].canonicalDeck, canonicalDeck);
  assert.equal(typeof calls[1][2].buildFallbackHtml, 'function');
  assert.equal(calls[2][0], 'buildPersistableDeckHtml');
  assert.equal(calls[2][1], doc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2])),
    { canonicalDeck }
  );
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
  loadResolveEditorMetadataPersistenceOptions(fileContent, context);
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

test('saveHistoryState delegates transaction scheduling to the shared history save handler', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const delegatedCalls = [];
  let capturedHandlerOptions = null;
  const context = {
    SlideNextStudioHistory: {
      createStudioHistorySaveHandler(options) {
        capturedHandlerOptions = options;
        return (debounce, transaction, canonicalDeck) => {
          options.setLiveCanonicalDeck(canonicalDeck);
          options.setPendingCanonicalDeck(canonicalDeck);
          delegatedCalls.push([debounce, transaction]);
          return { didCapture: true };
        };
      }
    },
    SlideNextStudioEditorTransaction: {},
    pendingEditorTransaction: null,
    undoDebounceTimer: null,
    clearTimeout() {},
    setTimeout() {},
    captureState() {},
    pendingEditorCanonicalDeck: null,
    liveCanonicalArgs: null,
    setEditorLiveCanonicalDeck(...args) {
      context.liveCanonicalArgs = args;
    }
  };

  vm.createContext(context);
  loadSaveHistoryState(fileContent, context);

  const transaction = { kind: 'slidenext.editor.transaction' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  assert.deepEqual(context.saveHistoryState(true, transaction, canonicalDeck), { didCapture: true });
  assert.deepEqual(delegatedCalls, [[true, transaction]]);
  assert.equal(context.pendingEditorCanonicalDeck, canonicalDeck);
  assert.deepEqual(context.liveCanonicalArgs, [canonicalDeck, null, null]);
  assert.equal(capturedHandlerOptions.transactionApi, context.SlideNextStudioEditorTransaction);
  assert.equal(typeof capturedHandlerOptions.getPendingTransaction, 'function');
  assert.equal(typeof capturedHandlerOptions.setPendingTransaction, 'function');
  assert.equal(typeof capturedHandlerOptions.setPendingCanonicalDeck, 'function');
  assert.equal(typeof capturedHandlerOptions.setLiveCanonicalDeck, 'function');
  assert.equal(typeof capturedHandlerOptions.getTimer, 'function');
  assert.equal(typeof capturedHandlerOptions.setTimer, 'function');
  assert.equal(capturedHandlerOptions.captureState, context.captureState);
});

test('saveHistoryState preserves canonical sidecars through the shared handler', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  let liveCanonicalArgs = null;
  const context = {
    SlideNextStudioHistory: {
      scheduleStudioHistoryCapture(timer, debounce, captureState) {
        captureState();
        return { nextTimer: timer };
      }
    },
    SlideNextStudioEditorTransaction: {},
    pendingEditorCanonicalDeck: null,
    pendingEditorTransaction: null,
    undoDebounceTimer: null,
    clearTimeout() {},
    setTimeout() {},
    captureState() {},
    getIframeDoc() {
      return null;
    },
    setEditorLiveCanonicalDeck(...args) {
      liveCanonicalArgs = args;
    }
  };

  vm.createContext(context);
  loadSaveHistoryState(fileContent, context);

  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  context.saveHistoryState(false, { id: 'legacy-transaction' }, canonicalDeck);

  assert.equal(context.pendingEditorCanonicalDeck, canonicalDeck);
  assert.deepEqual(liveCanonicalArgs, [canonicalDeck, null, null]);
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

test('captureState reuses the shared history state capturer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  const captureResult = {
    didCapture: true,
    undoStack: ['undo-entry'],
    redoStack: [],
    historyEntry: { html: '<html></html>' }
  };
  let delegatedArgs = null;
  const context = {
    createHistoryEntry() {},
    getEditorHistoryStackOptions() {},
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      createStudioHistoryStateCapturer(options = {}) {
        delegatedArgs = options;
        return () => {
          options.afterCapture();
          return captureResult;
        };
      }
    },
    pendingEditorTransaction: { id: 'pending' },
    pendingEditorCanonicalDeck: { kind: 'slidenext.deck', slides: [] },
    undoStack: [],
    updateHistoryButtons() {}
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureState())),
    captureResult
  );
  assert.equal(delegatedArgs.createHistoryEntry, context.createHistoryEntry);
  assert.equal(typeof delegatedArgs.getUndoStack, 'function');
  assert.equal(typeof delegatedArgs.getRedoStack, 'function');
  assert.equal(delegatedArgs.getHistoryStateOptions, context.getEditorHistoryStackOptions);
  assert.equal(typeof delegatedArgs.setUndoStack, 'function');
  assert.equal(typeof delegatedArgs.setRedoStack, 'function');
  assert.equal(delegatedArgs.updateHistoryButtons, context.updateHistoryButtons);
  assert.equal(context.pendingEditorTransaction, null);
  assert.equal(context.pendingEditorCanonicalDeck, null);
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
    '\n\n    function setCurrentPresentationCanonicalDeck('
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
    __createEditorDeckViewBuildOptions(nextDoc, options = {}) {
      callLog.push(['createEditorDeckViewBuildOptions', nextDoc, options]);
      return {
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: options.activeSlideId || 'slide-fallback',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
    },
    currentSlideIndex: 2,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
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
    SlideNextStudioEditorPersistence: studioPersistence,
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry(entry) {
        callLog.push(['normalizeStudioHistoryEntry', entry]);
        return {
          ...entry,
          normalized: true
        };
      },
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
  vm.runInContext('createEditorDeckViewBuildOptions = __createEditorDeckViewBuildOptions;', context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(restoreFrameFromHistoryEntrySource, context);

  context.restoreFrameFromHistoryEntry({
    html: '<html>snapshot</html>',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });

  assert.equal(iframeDoc.documentElement.innerHTML, '<html>restored</html>');
  assert.equal(callLog[0][0], 'getIframeDoc');
  assert.equal(callLog[1][0], 'normalizeStudioHistoryEntry');
  assert.equal(callLog[1][1].html, '<html>snapshot</html>');
  assert.deepEqual(callLog[1][1].selectedElementIds, ['node-1']);
  assert.equal(callLog[2][0], 'applyEditorSelectionState');
  assert.equal(Object.keys(callLog[2][1]).length, 0);
  assert.equal(callLog[3][0], 'restoreStudioHistoryEntry');
  assert.equal(callLog[3][1].normalized, true);
  assert.equal(callLog[4][0], 'createEditorDeckViewBuildOptions');
  assert.equal(callLog[4][1], null);
  assert.equal(callLog[4][2].activeSlideId, undefined);
  assert.equal(callLog[4][2].buildCanonicalDeck(), canonicalDeck);
  assert.equal(callLog[4][2].buildFallbackHtml(), '');
  assert.equal(callLog[5][0], 'restoreStudioHistoryFrameSetup');
  assert.equal(callLog[5][2], iframeDoc);
  assert.equal(callLog[5][3].renderOptions.activeSlideId, 'slide-fallback');
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
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
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
    createEditorDeckViewBuildOptions() {
      return {
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: '',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
    },
    currentSlideIndex: 0,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
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
    observeDeckActiveSlideState() {},
    restoreCommittedSelectionByIdsOnActiveSlide() {},
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck) {
      callLog.push(['setCurrentPresentationCanonicalDeck', nextCanonicalDeck]);
    },
    setActiveSlide() {},
    setActiveSlideById() {},
    setupIframeDragging() {},
    SlideNextStudioEditorPersistence: studioPersistence,
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
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
  vm.runInContext(persistedDeckStateHelperSource, context);
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

test('restoreFrameFromHistoryEntry applies a valid transaction without replacing the live frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  const restoreFrameFromHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function restoreFrameFromHistoryEntry(entry) {',
    '\n\n    function buildPersistableDeckHtml('
  );
  const element = {
    style: { left: '30px', top: '40px' }
  };
  const iframeDoc = {
    querySelector(selector) {
      return selector === '[data-editor-id="node-1"]' ? element : null;
    }
  };
  const callLog = [];
  const styleTransaction = studioTransaction.createStudioStyleTransaction([{
    elementId: 'node-1',
    before: { left: '10px', top: '20px' },
    after: { left: '30px', top: '40px' }
  }]);
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistorySelectionState(entry, options) {
        callLog.push(['restoreStudioHistorySelectionState', entry]);
        options.restoreCommittedSelectionState(entry.selectedElementIds, options.doc);
        options.observeDeckActiveSlideState(options.doc);
      }
    },
    applyEditorSelectionState() {
      throw new Error('snapshot restore should not clear the live selection');
    },
    capturePersistedDeckPlaybackState(doc, canonicalDeck) {
      callLog.push(['capturePersistedDeckPlaybackState', doc, canonicalDeck]);
      return null;
    },
    currentSlideIndex: 0,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getElementByEditorId(editorId, doc) {
      return doc.querySelector(`[data-editor-id="${editorId}"]`);
    },
    getIframeDoc() {
      return iframeDoc;
    },
    observeDeckActiveSlideState(doc) {
      callLog.push(['observeDeckActiveSlideState', doc]);
    },
    restoreCommittedSelectionByIdsOnActiveSlide(selectedIds, doc) {
      callLog.push(['restoreCommittedSelectionByIdsOnActiveSlide', selectedIds, doc]);
    },
    setCurrentPresentationCanonicalDeck(canonicalDeck) {
      callLog.push(['setCurrentPresentationCanonicalDeck', canonicalDeck]);
    },
    syncSelectionOverlay() {
      callLog.push(['syncSelectionOverlay']);
    },
    SlideNextStudioEditorPersistence: studioPersistence,
    updateEditorPersistedDeckState(nextState) {
      callLog.push(['updateEditorPersistedDeckState', nextState]);
    }
  };

  vm.createContext(context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(restoreFrameFromHistoryEntrySource, context);

  const result = context.restoreFrameFromHistoryEntry({
    html: '<html>snapshot</html>',
    selectedElementIds: ['node-1'],
    canonicalDeck: null
  }, {
    transaction: styleTransaction,
    direction: 'undo'
  });

  assert.equal(result.didRestoreTransaction, true);
  assert.deepEqual(element.style, { left: '10px', top: '20px' });
  assert.deepEqual(callLog.map(([name]) => name), [
    'restoreStudioHistorySelectionState',
    'restoreCommittedSelectionByIdsOnActiveSlide',
    'observeDeckActiveSlideState',
    'syncSelectionOverlay',
    'capturePersistedDeckPlaybackState',
    'updateEditorPersistedDeckState',
    'setCurrentPresentationCanonicalDeck'
  ]);
});

test('restoreFrameFromHistoryEntry resolves slide-scoped markup transactions without replacing the live frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckStateHelperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  const restoreFrameFromHistoryEntrySource = extractFunctionSource(
    fileContent,
    'function restoreFrameFromHistoryEntry(entry) {',
    '\n\n    function buildPersistableDeckHtml('
  );
  const slide = { innerHTML: '<p>After</p>' };
  const iframeDoc = {
    getElementById() {
      return null;
    }
  };
  const callLog = [];
  const markupTransaction = studioTransaction.createStudioMarkupTransaction([{
    elementId: 'slide:slide-1',
    before: '<p>Before</p>',
    after: '<p>After</p>'
  }]);
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistorySelectionState(entry, options) {
        options.restoreCommittedSelectionState(entry.selectedElementIds, options.doc);
        options.observeDeckActiveSlideState(options.doc);
      }
    },
    applyEditorSelectionState() {
      throw new Error('snapshot restore should not clear the live selection');
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    currentSlideIndex: 0,
    getElementByEditorId() {
      return null;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlideById(slideId, doc) {
      assert.equal(slideId, 'slide-1');
      assert.equal(doc, iframeDoc);
      return slide;
    },
    makeElementsHoverable() {},
    observeDeckActiveSlideState() {},
    restoreCommittedSelectionByIdsOnActiveSlide() {},
    setCurrentPresentationCanonicalDeck() {},
    syncSelectionOverlay() {},
    updateEditorPersistedDeckState() {}
  };

  vm.createContext(context);
  vm.runInContext(persistedDeckStateHelperSource, context);
  vm.runInContext(restoreFrameFromHistoryEntrySource, context);

  const result = context.restoreFrameFromHistoryEntry({
    html: '<html>snapshot</html>',
    selectedElementIds: [],
    canonicalDeck: null
  }, {
    transaction: markupTransaction,
    direction: 'undo'
  });

  assert.equal(result.didRestoreTransaction, true);
  assert.equal(slide.innerHTML, '<p>Before</p>');
});
