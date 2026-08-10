const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const liveSelection = require('../shared/studio-editor-live-selection.js');
const selection = require('../shared/studio-editor-selection.js');
const studioPersistence = require('../shared/studio-editor-persistence.js');
const presentationMetadataFixture = require('./helpers/studio-presentation-metadata-fixture.js');
const presentationUrlFixture = require('./helpers/studio-presentation-url-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor composes selection state normalization through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionStateNormalizer =/);
  assert.match(source, /normalizeStudioSelectionState/);
  assert.match(source, /if \(typeof studioEditorSelectionStateNormalizer !== 'function'\)/);
  assert.doesNotMatch(source, /applyEditorSelectionState\.normalizer/);
});

test('editor composes selection class refresh through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionClassRefresher =/);
  assert.match(source, /refreshStudioSelectionClasses/);
  assert.match(source, /if \(typeof studioEditorSelectionClassRefresher !== 'function'\)/);
  assert.doesNotMatch(source, /refreshSelectionClasses\.refresher/);
});

test('editor composes selection state commits through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionStateCommitter =/);
  assert.match(source, /commitStudioSelectionState/);
  assert.match(source, /if \(typeof studioEditorSelectionStateCommitter !== 'function'\)/);
  assert.doesNotMatch(source, /commitEditorSelectionState\.committer/);
});

test('editor composes active-slide selection restore through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionRestorer =/);
  assert.match(source, /restoreStudioSelectionByIdsOnActiveSlide/);
  assert.match(source, /if \(typeof studioEditorSelectionRestorer !== 'function'\)/);
  assert.doesNotMatch(source, /restoreSelectionByIdsOnActiveSlide\.restorer/);
});

test('editor composes committed selection ID reading through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorCommittedSelectionIdsReader =/);
  assert.match(source, /getStudioCommittedSelectedElementIds/);
  assert.match(source, /if \(typeof studioEditorCommittedSelectionIdsReader !== 'function'\)/);
  assert.doesNotMatch(source, /getCommittedSelectedEditorElementIds\.reader/);
});

test('editor composes live selection ID reading through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionIdsReader =/);
  assert.match(source, /getStudioSelectedElementIds/);
  assert.match(source, /if \(typeof studioEditorSelectionIdsReader !== 'function'\)/);
  assert.doesNotMatch(source, /getSelectedEditorElementIds\.reader/);
});

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return `${presentationMetadataFixture.getStudioPresentationMetadataFixtureSource()}\n${presentationUrlFixture.getStudioPresentationUrlFixtureSource()}\n${fileContent.slice(start, end)}`;
}

function installSelectionAccessors(context) {
  context.getStudioSelectedElements = () => context.selectedElements || [];
  context.getStudioSelectedElement = () => context.selectedElement || null;
  context.setStudioSelectionState = (nextState = {}) => {
    context.selectedElements = Array.isArray(nextState.selectedElements)
      ? nextState.selectedElements
      : [];
    context.selectedElement = Object.prototype.hasOwnProperty.call(nextState, 'selectedElement')
      ? nextState.selectedElement
      : context.selectedElements[0] || null;
    return {
      selectedElements: context.selectedElements,
      selectedElement: context.selectedElement
    };
  };
  context.clearStudioSelectionState = () => {
    context.selectedElements = [];
    context.selectedElement = null;
    return {
      selectedElements: [],
      selectedElement: null
    };
  };
}

function loadGetCommittedSelectedEditorElementIds(fileContent, context) {
  installSelectionAccessors(context);
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorCommittedSelectionIdsReader =',
    '\n\n    function areEditorIdListsEqual(a = [], b = []) {'
  );
  vm.runInContext(helperSource, context);
}

function loadGetSelectedEditorElementIds(fileContent, context) {
  installSelectionAccessors(context);
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorSelectionIdsReader =',
    '\n\n    const studioEditorCommittedSelectionIdsReader ='
  );
  vm.runInContext(helperSource, context);
}

function loadRefreshSelectionClasses(fileContent, context) {
  installSelectionAccessors(context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function refreshSelectionClasses() {',
    '\n\n    function applyEditorSelectionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCommitEditorSelectionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorSelectionStateCommitter =',
    '\n\n    function restoreSelectionByIdsOnActiveSlide(selectedIds, doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadRestoreSelectionByIdsOnActiveSlide(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorSelectionRestorer =',
    '\n\n    function restoreCommittedSelectionByIdsOnActiveSlide(selectedIds, doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('restoreSelectionByIdsOnActiveSlide delegates to shared selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const selectedIds = ['node-1'];
  const nextSelectionState = { restored: true, selectedElements: [{ id: 'node-1' }] };
  let delegatedArgs = null;
  let appliedState = null;
  const context = {
    SlideNextStudioEditorSelection: {
      restoreStudioSelectionByIdsOnActiveSlide(...args) {
        delegatedArgs = args;
        return nextSelectionState;
      }
    },
    getEditorSelectionOptions(options) {
      return { doc: options.doc, selectionOptions: true };
    },
    applyEditorSelectionState(nextState) {
      appliedState = nextState;
    }
  };

  vm.createContext(context);
  loadRestoreSelectionByIdsOnActiveSlide(fileContent, context);

  assert.equal(context.restoreSelectionByIdsOnActiveSlide(selectedIds, iframeDoc), true);
  assert.equal(delegatedArgs[0], selectedIds);
  assert.equal(delegatedArgs[1], iframeDoc);
  assert.deepEqual(delegatedArgs[2], { doc: iframeDoc, selectionOptions: true });
  assert.equal(appliedState, nextSelectionState);
});

test('restoreSelectionByIdsOnActiveSlide fails closed when shared selection is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadRestoreSelectionByIdsOnActiveSlide(fileContent, context);

  assert.equal(context.restoreSelectionByIdsOnActiveSlide(['node-1'], { id: 'doc' }), false);
});

test('commitEditorSelectionState delegates to the shared selection commit helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nextSelectionState = { selectedElements: [{ id: 'node-1' }] };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorSelection: {
      commitStudioSelectionState(...args) {
        delegatedArgs = args;
        return { committed: true };
      }
    },
    getEditorSelectionOptions() {
      return { selectionOptions: true };
    },
    applyEditorSelectionState() {},
    refreshSelectionClasses() {},
    syncSelectionOverlay() {},
    syncInspectorForSelection() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadCommitEditorSelectionState(fileContent, context);

  assert.deepEqual(
    context.commitEditorSelectionState(nextSelectionState),
    { committed: true }
  );
  assert.equal(delegatedArgs[0], nextSelectionState);
  assert.equal(delegatedArgs[1].selectionOptions, true);
  assert.equal(delegatedArgs[1].applySelectionState, context.applyEditorSelectionState);
});

test('commitEditorSelectionState fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadCommitEditorSelectionState(fileContent, context);

  assert.equal(context.commitEditorSelectionState({ selectedElements: [] }), false);
});

test('refreshSelectionClasses delegates shared class refresh and updates local selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const currentElement = { id: 'node-1' };
  const refreshedElement = { id: 'node-2' };
  let delegatedArgs = null;
  const context = {
    selectedElements: [currentElement],
    selectedElement: currentElement,
    SlideNextStudioEditorSelection: {
      refreshStudioSelectionClasses(...args) {
        delegatedArgs = args;
        return {
          selectedElements: [refreshedElement],
          selectedElement: refreshedElement
        };
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getEditorSelectionOptions(options) {
      return { doc: options.doc, selectionOptions: true };
    }
  };

  vm.createContext(context);
  loadRefreshSelectionClasses(fileContent, context);

  assert.equal(context.refreshSelectionClasses(), true);
  assert.equal(delegatedArgs[0], iframeDoc);
  assert.equal(delegatedArgs[1][0], currentElement);
  assert.deepEqual(delegatedArgs[2], { doc: iframeDoc, selectionOptions: true });
  assert.equal(context.selectedElements[0], refreshedElement);
  assert.equal(context.selectedElement, refreshedElement);
});

test('refreshSelectionClasses clears local selection when the shared class refresh is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const staleElement = { id: 'stale' };
  const context = {
    selectedElements: [staleElement],
    selectedElement: staleElement,
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadRefreshSelectionClasses(fileContent, context);

  assert.equal(context.refreshSelectionClasses(), false);
  assert.equal(context.selectedElements.length, 0);
  assert.equal(context.selectedElement, null);
});

test('getSelectedEditorElementIds delegates to shared selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectedElements = [{ id: 'node-1' }];
  let delegatedArgs = null;
  const context = {
    selectedElements,
    SlideNextStudioEditorSelection: {
      getStudioSelectedElementIds(...args) {
        delegatedArgs = args;
        return ['node-1'];
      }
    },
    getEditorSelectionOptions() {
      return { selectionOptions: true };
    }
  };

  vm.createContext(context);
  loadGetSelectedEditorElementIds(fileContent, context);

  const result = context.getSelectedEditorElementIds();
  assert.equal(result.length, 1);
  assert.equal(result[0], 'node-1');
  assert.equal(delegatedArgs[0], selectedElements);
  assert.deepEqual(delegatedArgs[1], { selectionOptions: true });
});

test('getSelectedEditorElementIds fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    selectedElements: [{ id: 'node-1' }],
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadGetSelectedEditorElementIds(fileContent, context);

  assert.equal(context.getSelectedEditorElementIds().length, 0);
});

test('getCommittedSelectedEditorElementIds delegates to shared selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const selectedElements = [{ id: 'node-1' }];
  let delegatedArgs = null;
  const context = {
    selectedElements,
    SlideNextStudioEditorSelection: {
      getStudioCommittedSelectedElementIds(...args) {
        delegatedArgs = args;
        return ['node-1'];
      }
    },
    getEditorSelectionOptions(options) {
      return { doc: options.doc, selectionOptions: true };
    }
  };

  vm.createContext(context);
  loadGetCommittedSelectedEditorElementIds(fileContent, context);

  assert.deepEqual(context.getCommittedSelectedEditorElementIds(iframeDoc), ['node-1']);
  assert.equal(delegatedArgs[0], selectedElements);
  assert.equal(delegatedArgs[1], iframeDoc);
  assert.deepEqual(delegatedArgs[2], { doc: iframeDoc, selectionOptions: true });
});

test('getCommittedSelectedEditorElementIds fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    selectedElements: [{ id: 'node-1' }],
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadGetCommittedSelectedEditorElementIds(fileContent, context);

  assert.equal(context.getCommittedSelectedEditorElementIds({ id: 'doc' }).length, 0);
});

test('applyEditorSelectionState keeps only connected selections on the active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorSelectionOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorSelectionOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const applyEditorSelectionStateSource = extractFunctionSource(
    fileContent,
    'function applyEditorSelectionState(nextState = {}) {',
    '\n\n    function commitEditorSelectionState(nextSelectionState, options = {}) {'
  );

  const activeElement = { id: 'active', isConnected: true, onActiveSlide: true };
  const offSlideElement = { id: 'off-slide', isConnected: true, onActiveSlide: false };
  const readyDoc = {
    activeSlide: {
      contains(element) {
        return !!(element && element.onActiveSlide);
      }
    }
  };

  const context = {
    SlideNextStudioEditorSelection: selection,
    selectedElements: [],
    selectedElement: null,
    isEligibleEditableElement(element) {
      return !!element;
    },
    assignEditorElementId(element) {
      return element && element.id ? element.id : '';
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getElementByEditorId() {
      return null;
    },
    getIframeDoc() {
      return readyDoc;
    }
  };
  installSelectionAccessors(context);

  vm.createContext(context);
  vm.runInContext(getEditorSelectionOptionsSource, context);
  context.studioEditorSelectionStateNormalizer = (nextState) => context.SlideNextStudioEditorSelection
    .normalizeStudioSelectionState(nextState, context.getEditorSelectionOptions());
  vm.runInContext(applyEditorSelectionStateSource, context);

  context.applyEditorSelectionState({
    selectedElements: [offSlideElement, activeElement],
    selectedElement: offSlideElement
  });
  assert.deepEqual(context.selectedElements, [activeElement]);
  assert.equal(context.selectedElement, activeElement);

  context.getIframeDoc = () => null;
  context.applyEditorSelectionState({
    selectedElements: [activeElement],
    selectedElement: activeElement
  });
  assert.deepEqual(context.selectedElements, []);
  assert.equal(context.selectedElement, null);
});

test('applyEditorSelectionState clears local selection when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyEditorSelectionStateSource = extractFunctionSource(
    fileContent,
    'function applyEditorSelectionState(nextState = {}) {',
    '\n\n    function commitEditorSelectionState(nextSelectionState, options = {}) {'
  );
  const staleElement = { id: 'stale' };
  const context = {
    selectedElements: [staleElement],
    selectedElement: staleElement,
    SlideNextStudioEditorSelection: null,
    studioEditorSelectionStateNormalizer: null
  };
  installSelectionAccessors(context);

  vm.createContext(context);
  vm.runInContext(applyEditorSelectionStateSource, context);

  assert.equal(context.applyEditorSelectionState({ selectedElements: [staleElement] }), false);
  assert.equal(context.selectedElements.length, 0);
  assert.equal(context.selectedElement, null);
});

test('getLiveSelectedElements keeps only connected selections on the active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorSelectionOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorSelectionOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const getLiveSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function getLiveSelectedElements(elements = getStudioSelectedElements(), doc = getIframeDoc()) {',
    '\n\n    function getTransformSelectionState(elements = getStudioSelectedElements()) {'
  );

  const activeElement = { id: 'active', isConnected: true, onActiveSlide: true };
  const offSlideElement = { id: 'off-slide', isConnected: true, onActiveSlide: false };
  const staleElement = { id: 'stale', isConnected: false, onActiveSlide: true };
  const readyDoc = {
    activeSlide: {
      contains(element) {
        return !!(element && element.onActiveSlide);
      }
    }
  };

  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    selectedElements: [offSlideElement, staleElement, activeElement],
    isEligibleEditableElement(element) {
      return !!element;
    },
    assignEditorElementId(element) {
      return element && element.id ? element.id : '';
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getElementByEditorId() {
      return null;
    },
    getIframeDoc() {
      return readyDoc;
    }
  };
  installSelectionAccessors(context);

  vm.createContext(context);
  vm.runInContext(getEditorSelectionOptionsSource, context);
  vm.runInContext(getLiveSelectedElementsSource, context);

  assert.deepEqual(context.getLiveSelectedElements(), [activeElement]);
  assert.deepEqual(context.getLiveSelectedElements([offSlideElement, activeElement], null), []);
});

test('getLiveSelectedElements fails closed when live-selection filtering is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getLiveSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function getLiveSelectedElements(elements = getStudioSelectedElements(), doc = getIframeDoc()) {',
    '\n\n    function getTransformSelectionState(elements = getStudioSelectedElements()) {'
  );
  const context = {
    selectedElements: [{ id: 'stale' }],
    SlideNextStudioEditorLiveSelection: null
  };
  installSelectionAccessors(context);

  vm.createContext(context);
  vm.runInContext(getLiveSelectedElementsSource, context);

  assert.equal(context.getLiveSelectedElements([], { id: 'doc' }).length, 0);
});

test('getEditorHistoryOptions includes editor runtime attr names for sanitized history snapshots', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
  );
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

  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay', 'editorGuidesLayer'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: studioPersistence,
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        assert.equal(metadata, context.currentPresentationMetadata);
        return {
          emptyContainerIds: ['gitNodesContainer']
        };
      }
    },
    SlideNextDeckPersistence: {
      stripTransientDeckRuntimeState(root, options) {
        context.sanitizedRoot = root;
        context.sanitizedOptions = options;
      }
    },
    currentPresentationMetadata: {
      id: 'onboarding-presentation',
      persistence: {
        emptyContainerIds: ['gitNodesContainer']
      }
    },
    getActiveSlideId() {
      return 'slide-2';
    },
    getSelectedEditorElementIds() {
      return ['node-1'];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);

  const options = context.getEditorHistoryOptions();

  assert.deepEqual(
    JSON.parse(JSON.stringify(options.chromeNodeIds)),
    ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay', 'editorGuidesLayer']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(options.removableClassNames)),
    ['editor-selected', 'editor-hoverable', 'editor-dragging']
  );
  assert.equal(options.editorElementIdAttr, 'data-editor-id');
  assert.equal(options.editorSlideIdAttr, 'data-slide-id');
  assert.equal(typeof options.sanitizeFrameRoot, 'function');
  const root = { id: 'history-root' };
  options.sanitizeFrameRoot(root);
  assert.equal(context.sanitizedRoot, root);
  assert.deepEqual(JSON.parse(JSON.stringify(context.sanitizedOptions)), {
    emptyContainerIds: ['gitNodesContainer']
  });
  assert.equal(typeof options.getActiveSlideId, 'function');
  assert.equal(typeof options.getSelectedElementIds, 'function');
  assert.equal(typeof options.areIdListsEqual, 'function');
});

test('getEditorHistoryOptions threads sanitizer overrides and explicit persistence options into the frame sanitizer', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
  );
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

  const sanitizeCalls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: studioPersistence,
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        assert.equal(metadata, context.currentPresentationMetadata);
        return {
          emptyContainerIds: ['gitNodesContainer']
        };
      }
    },
    SlideNextPresentationMetadata: {
      mergePresentationPersistenceOptions(...optionSets) {
        return {
          emptyContainerIds: Array.from(new Set(optionSets.flatMap((optionSet) => optionSet.emptyContainerIds || [])))
        };
      }
    },
    SlideNextDeckImport: {
      sanitizeDeckSourceClone(root, options) {
        sanitizeCalls.push([root, options]);
      }
    },
    currentPresentationMetadata: {
      id: 'onboarding-presentation',
      persistence: {
        emptyContainerIds: ['gitNodesContainer']
      }
    },
    getActiveSlideId() {
      return 'slide-3';
    },
    getSelectedEditorElementIds() {
      return ['node-9'];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);

  const options = context.getEditorHistoryOptions({
    chromeNodeIds: ['editorHistoryOverlay'],
    transientClassNames: ['history-selected'],
    editorElementIdAttr: 'data-history-id',
    editorSlideIdAttr: 'data-history-slide-id',
    persistenceOptions: {
      emptyContainerIds: ['pixelMatrix']
    },
    customFlag: true
  });
  const root = { id: 'history-root' };
  options.sanitizeFrameRoot(root);

  assert.deepEqual(JSON.parse(JSON.stringify(options.chromeNodeIds)), ['editorHistoryOverlay']);
  assert.deepEqual(JSON.parse(JSON.stringify(options.removableClassNames)), ['history-selected']);
  assert.equal(options.editorElementIdAttr, 'data-history-id');
  assert.equal(options.editorSlideIdAttr, 'data-history-slide-id');
  assert.equal(options.customFlag, true);
  assert.equal(sanitizeCalls.length, 1);
  assert.equal(sanitizeCalls[0][0], root);
  assert.deepEqual(
    JSON.parse(JSON.stringify(sanitizeCalls[0][1])),
    {
      ignoredNodeIds: ['editorHistoryOverlay'],
      transientClassNames: ['history-selected'],
      editorElementIdAttr: 'data-history-id',
      editorSlideIdAttr: 'data-history-slide-id',
      persistenceOptions: {
        emptyContainerIds: ['gitNodesContainer', 'pixelMatrix']
      }
    }
  );
});

test('getEditorHistoryOptions prefers the shared merged persistence resolver for frame sanitization', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
  );
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

  const sanitizeCalls = [];
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioEditorPersistence: studioPersistence,
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions(metadata, explicitOptions) {
        calls.push(['resolveMergedPresentationPersistenceOptions', metadata, explicitOptions]);
        assert.equal(metadata, context.currentPresentationMetadata);
        assert.deepEqual(JSON.parse(JSON.stringify(explicitOptions)), {
          emptyContainerIds: ['pixelMatrix']
        });
        return {
          emptyContainerIds: ['gitNodesContainer', 'pixelMatrix']
        };
      },
      resolvePresentationPersistenceOptions() {
        throw new Error('resolvePresentationPersistenceOptions should not run when merged resolver is available');
      }
    },
    SlideNextDeckImport: {
      sanitizeDeckSourceClone(root, options) {
        sanitizeCalls.push([root, options]);
      }
    },
    currentPresentationMetadata: {
      id: 'onboarding-presentation',
      persistence: {
        emptyContainerIds: ['gitNodesContainer']
      }
    },
    getActiveSlideId() {
      return 'slide-3';
    },
    getSelectedEditorElementIds() {
      return ['node-9'];
    },
    areEditorIdListsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(getEditorHistoryOptionsSource, context);

  const options = context.getEditorHistoryOptions({
    persistenceOptions: {
      emptyContainerIds: ['pixelMatrix']
    }
  });
  const root = { id: 'history-root' };
  options.sanitizeFrameRoot(root);

  assert.deepEqual(calls.map(([name]) => name), ['resolveMergedPresentationPersistenceOptions']);
  assert.equal(sanitizeCalls.length, 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(sanitizeCalls[0][1].persistenceOptions)),
    {
      emptyContainerIds: ['gitNodesContainer', 'pixelMatrix']
    }
  );
});

test('getEditorHistoryStackOptions forwards sanitizer overrides into the underlying history options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorHistoryStackOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorHistoryStackOptions(options = {}) {',
    '\n\n    function assignEditorSlideId(slide, options = {}) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioHistory: {
      normalizeStudioHistoryEntry(entry) {
        return { normalized: entry };
      },
      areStudioHistoryEntriesEqual(left, right) {
        return left === right;
      }
    },
    getEditorHistoryOptions(options = {}) {
      calls.push(options);
      return {
        chromeNodeIds: options.chromeNodeIds || [],
        sanitizeFrameRoot: options.sanitizeFrameRoot || null
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorHistoryStackOptionsSource, context);

  const sanitizer = () => {};
  const options = context.getEditorHistoryStackOptions({
    chromeNodeIds: ['editorHistoryOverlay'],
    sanitizeFrameRoot: sanitizer
  });

  assert.deepEqual(calls, [{
    chromeNodeIds: ['editorHistoryOverlay'],
    sanitizeFrameRoot: sanitizer
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(options.chromeNodeIds)), ['editorHistoryOverlay']);
  assert.equal(options.sanitizeFrameRoot, sanitizer);
  assert.equal(options.normalizeEntry('entry').normalized, 'entry');
  assert.equal(options.areEntriesEqual('a', 'a'), true);
  assert.equal(options.maxUndoEntries, 50);
});
