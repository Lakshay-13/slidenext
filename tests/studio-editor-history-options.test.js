const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const historyOptions = require('../shared/studio-editor-history-options.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history options resolver assembles sanitization and document-aware selection callbacks', () => {
  const calls = [];
  const resolver = historyOptions.createStudioEditorHistoryOptionsResolver({
    getDeckSanitizerOptions(options) {
      calls.push(['sanitize-options', options]);
      return {
        chromeNodeIds: ['editor-overlay'],
        transientClassNames: ['editor-selected'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id'
      };
    },
    resolveMetadataPersistenceOptions(options) {
      calls.push(['persistence-options', options]);
      return { emptyContainerIds: ['runtime-root'] };
    },
    deckImportApi: {
      sanitizeDeckSourceClone(root, options) {
        calls.push(['sanitize', root, options]);
      }
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedElementIds(doc) {
      return doc && doc.selectedIds ? doc.selectedIds : [];
    },
    areIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
  });

  const input = { persistenceOptions: { emptyContainerIds: ['caller-root'] }, custom: true };
  const options = resolver(input);
  const root = { id: 'history-root' };
  options.sanitizeFrameRoot(root);

  assert.deepEqual(options.chromeNodeIds, ['editor-overlay']);
  assert.deepEqual(options.removableClassNames, ['editor-selected']);
  assert.equal(options.getActiveSlideId(), 'slide-1');
  assert.deepEqual(options.getSelectedElementIds({ selectedIds: ['node-1'] }), ['node-1']);
  assert.equal(options.areIdListsEqual(['a'], ['a']), true);
  assert.equal(options.custom, true);
  assert.deepEqual(calls, [
    ['sanitize-options', input],
    ['persistence-options', { persistenceOptions: input.persistenceOptions }],
    ['sanitize', root, {
      ignoredNodeIds: ['editor-overlay'],
      transientClassNames: ['editor-selected'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistenceOptions: { emptyContainerIds: ['runtime-root'] }
    }]
  ]);
});

test('history options resolver falls back to deck persistence sanitization', () => {
  let sanitized = null;
  const resolver = historyOptions.createStudioEditorHistoryOptionsResolver({
    getDeckSanitizerOptions: () => ({
      chromeNodeIds: ['overlay'],
      transientClassNames: ['selected'],
      editorElementIdAttr: 'data-node-id',
      editorSlideIdAttr: 'data-slide-id'
    }),
    resolveMetadataPersistenceOptions: () => ({ emptyContainerIds: ['runtime-root'] }),
    deckPersistenceApi: {
      stripTransientDeckRuntimeState(root, options) {
        sanitized = { root, options };
      }
    }
  });

  const root = { id: 'persisted-root' };
  const options = resolver();
  options.sanitizeFrameRoot(root);

  assert.deepEqual(sanitized, {
    root,
    options: { emptyContainerIds: ['runtime-root'] }
  });
});

test('history stack options resolver adds history behavior while preserving caller overrides', () => {
  const calls = [];
  const normalizeEntry = (entry) => ({ normalized: entry });
  const areEntriesEqual = (left, right) => left === right;
  const isCanonicalDeck = () => true;
  const resolver = historyOptions.createStudioEditorHistoryStackOptionsResolver({
    getHistoryOptions(options) {
      calls.push(options);
      return { source: 'history-options' };
    },
    getHistoryApi() {
      return {
        normalizeStudioHistoryEntry: normalizeEntry,
        areStudioHistoryEntriesEqual: areEntriesEqual
      };
    },
    isCanonicalDeck
  });

  const result = resolver({ custom: true, maxUndoEntries: 12 });

  assert.deepEqual(calls, [{ custom: true, maxUndoEntries: 12 }]);
  assert.equal(result.source, 'history-options');
  assert.equal(result.custom, true);
  assert.equal(result.normalizeEntry, normalizeEntry);
  assert.equal(result.areEntriesEqual, areEntriesEqual);
  assert.equal(result.isCanonicalDeck, isCanonicalDeck);
  assert.equal(result.maxUndoEntries, 12);
});

test('editor loads the history options module before using the inline compatibility adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-options\.js"><\/script>/);
  assert.match(fileContent, /SlideNextStudioEditorHistoryOptions/);
  assert.match(fileContent, /getEditorHistoryOptions\.resolver/);
});

test('inline history adapter delegates to the shared module when it is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const start = fileContent.indexOf('function getEditorHistoryOptions(options = {}) {');
  const end = fileContent.indexOf('\n\n    function getEditorHistoryStackOptions(options = {}) {', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const calls = [];
  const context = {
    SlideNextStudioEditorHistoryOptions: historyOptions,
    getEditorDeckSanitizerOptions(options) {
      calls.push(['sanitizer', options]);
      return {
        chromeNodeIds: ['overlay'],
        transientClassNames: ['selected'],
        editorElementIdAttr: 'data-node-id',
        editorSlideIdAttr: 'data-slide-id'
      };
    },
    resolveEditorMetadataPersistenceOptions(options) {
      calls.push(['metadata', options]);
      return { emptyContainerIds: ['runtime-root'] };
    },
    SlideNextDeckImport: {
      sanitizeDeckSourceClone(root, options) {
        calls.push(['sanitize', root, options]);
      }
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getCommittedSelectedEditorElementIds(doc) {
      return doc && doc.selectedIds ? doc.selectedIds : [];
    },
    getSelectedEditorElementIds() {
      return [];
    },
    areEditorIdListsEqual() {
      return true;
    }
  };

  vm.createContext(context);
  vm.runInContext(fileContent.slice(start, end), context);

  const documentRef = { selectedIds: ['node-1'] };
  const result = context.getEditorHistoryOptions({ persistenceOptions: { emptyContainerIds: ['caller-root'] } });
  const root = { id: 'history-root' };
  result.sanitizeFrameRoot(root);

  assert.deepEqual(result.getSelectedElementIds(documentRef), ['node-1']);
  assert.deepEqual(calls, [
    ['sanitizer', { persistenceOptions: { emptyContainerIds: ['caller-root'] } }],
    ['metadata', { persistenceOptions: { emptyContainerIds: ['caller-root'] } }],
    ['sanitize', root, {
      ignoredNodeIds: ['overlay'],
      transientClassNames: ['selected'],
      editorElementIdAttr: 'data-node-id',
      editorSlideIdAttr: 'data-slide-id',
      persistenceOptions: { emptyContainerIds: ['runtime-root'] }
    }]
  ]);
});

test('inline history stack adapter delegates to the shared module when it is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const start = fileContent.indexOf('function getEditorHistoryStackOptions(options = {}) {');
  const end = fileContent.indexOf('\n\n    function assignEditorSlideId(slide, options = {}) {', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const calls = [];
  const normalizeEntry = (entry) => ({ normalized: entry });
  const areEntriesEqual = (left, right) => left === right;
  const context = {
    SlideNextStudioEditorHistoryOptions: historyOptions,
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry: normalizeEntry,
      areStudioHistoryEntriesEqual: areEntriesEqual
    },
    getEditorHistoryOptions(options) {
      calls.push(options);
      return { source: 'history-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(fileContent.slice(start, end), context);

  const result = context.getEditorHistoryStackOptions({ custom: true });

  assert.deepEqual(calls, [{ custom: true }]);
  assert.equal(result.source, 'history-options');
  assert.equal(result.custom, true);
  assert.equal(result.normalizeEntry, normalizeEntry);
  assert.equal(result.areEntriesEqual, areEntriesEqual);
  assert.equal(result.maxUndoEntries, 50);
});
