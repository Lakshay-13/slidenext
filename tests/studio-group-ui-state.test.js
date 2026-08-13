const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioGroup = require('../shared/studio-editor-group.js');
const groupMutation = require('../shared/studio-editor-group-mutation.js');
const groupTransaction = require('../shared/studio-editor-group-transaction.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalGroup = require('../shared/studio-editor-canonical-group.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const groupController = require('../shared/studio-editor-group-controller.js');
const selectionFixture = require('./helpers/studio-selection-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = selectionFixture.extractSelectionAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function loadGroupMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorGroupMutationWithTransaction(options = {}) {',
    'function groupSelectedElements() {'
  );
  context.SlideNextStudioEditorGroup = {
    ...studioGroup,
    ...(context.SlideNextStudioEditorGroup || {})
  };
  context.SlideNextStudioEditorGroupMutation = groupMutation;
  context.SlideNextStudioEditorGroupTransaction = groupTransaction;
  vm.runInContext(helperSource, context);
}

function loadUngroupMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorUngroupMutationWithTransaction(options = {}) {',
    'function ungroupSelectedElements() {'
  );
  context.SlideNextStudioEditorGroup = {
    ...studioGroup,
    ...(context.SlideNextStudioEditorGroup || {})
  };
  context.SlideNextStudioEditorGroupMutation = groupMutation;
  vm.runInContext(helperSource, context);
}

function installGroupController(context) {
  context.studioEditorGroupController = groupController.createStudioEditorGroupController({
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    canonicalGroupApi: context.SlideNextStudioEditorCanonicalGroup,
    deckImportApi: context.SlideNextDeckImport,
    buildGroupSelectionActionState: context.buildGroupSelectionActionState,
    buildUngroupSelectionActionState: context.buildUngroupSelectionActionState,
    updateGroupActionState: context.updateGroupActionState,
    getIframeDoc: context.getIframeDoc,
    getSlideMetrics: context.getSlideMetrics,
    getRectOnSlide: context.getRectOnSlide,
    getNormalizedSlideLayerOrder: context.getNormalizedSlideLayerOrder,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    getEditorSlideId: context.getEditorSlideId,
    applyGroupMutation: context.applyEditorGroupMutationWithTransaction,
    applyUngroupMutation: context.applyEditorUngroupMutationWithTransaction,
    commitSelectionState: context.commitEditorSelectionState,
    finalizeDeckMutation: context.finalizeEditorDeckMutation,
    prepareGroup: context.makeElementsHoverable
  });
}

test('updateGroupActionState delegates toolbar state assembly to the shared group view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateGroupActionState(doc = getIframeDoc()) {',
    '\n\n    function isEditorGroupElement(element) {'
  );
  const calls = [];
  const doc = { activeSlide: {} };
  const context = {
    buildGroupSelectionActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return { canGroup: true };
    },
    buildUngroupSelectionActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return { canUngroup: false };
    },
    SlideNextStudioEditorGroup: {
      syncStudioGroupToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateGroupActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].canGroup, true);
  assert.equal(calls[0].canUngroup, false);
});

test('updateGroupActionState caches the shared group toolbar synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateGroupActionState(doc = getIframeDoc()) {',
    '\n\n    function isEditorGroupElement(element) {'
  );
  const doc = { id: 'doc' };
  const calls = [];
  const context = {
    buildGroupSelectionActionState(currentDoc) {
      calls.push(['group-state', currentDoc]);
      return { canGroup: true };
    },
    buildUngroupSelectionActionState(currentDoc) {
      calls.push(['ungroup-state', currentDoc]);
      return { canUngroup: false };
    },
    SlideNextStudioEditorGroup: {
      syncStudioGroupToolbarState() {
        throw new Error('direct group sync should not run');
      },
      createStudioGroupToolbarStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          const groupState = options.getGroupActionState(currentDoc);
          const ungroupState = options.getUngroupActionState(currentDoc);
          return groupState.canGroup && !ungroupState.canUngroup;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateGroupActionState(doc), true);
  assert.equal(context.updateGroupActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'group-state').map(([, currentDoc]) => currentDoc), [doc, doc]);
  assert.deepEqual(calls.filter(([name]) => name === 'ungroup-state').map(([, currentDoc]) => currentDoc), [doc, doc]);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('updateGroupActionState fails closed when the shared group view is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateGroupActionState(doc = getIframeDoc()) {',
    '\n\n    function isEditorGroupElement(element) {'
  );
  const context = {
    buildGroupSelectionActionState() {
      throw new Error('selection state should not be built');
    },
    buildUngroupSelectionActionState() {
      throw new Error('ungroup state should not be built');
    },
    document: {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateGroupActionState({}), false);
});

test('buildGroupSelectionActionState requires a complete same-parent freeform selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const first = { id: 'first', parentElement: parent };
  const second = { id: 'second', parentElement: parent };
  const selection = [first, second];
  const layoutItems = [{ element: first }, { element: second }];
  const context = {
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getLiveSelectedElements() {
      return selection;
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    },
    getEditorClosestPositionedAncestor() {
      return parent;
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems() {
        return layoutItems;
      },
      isStudioFreeformPositioned() {
        return true;
      }
    },
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return parent;
      }
    },
    SlideNextStudioEditorGroup: {
      buildStudioGroupPlan(items) {
        assert.equal(items, layoutItems);
        return {
          canGroup: true,
          selection: layoutItems,
          bounds: { left: 0, top: 0, width: 100, height: 80 },
          nextItems: layoutItems
        };
      }
    },
    getRectOnSlide() {},
    isElementLocked() {},
    selectedElements: selection
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  const result = context.buildGroupSelectionActionState(doc);
  assert.equal(result.parent, parent);
  assert.equal(result.canGroup, true);
  assert.equal(result.groupPlan.selection.length, 2);
});

test('buildGroupSelectionActionState fails closed before reading the document when the shared group planner is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );
  const context = {
    SlideNextStudioEditorGroup: {},
    getIframeDoc() {
      throw new Error('document should not be read without a group planner');
    },
    getStudioSelectedElements() {
      throw new Error('selection should not be read without a group planner');
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildGroupSelectionActionState())),
    {
      slide: null,
      selection: [],
      layoutItems: [],
      parent: null,
      groupPlan: {
        canGroup: false,
        selection: [],
        bounds: null,
        nextItems: []
      },
      canGroup: false
    }
  );
});

test('buildGroupSelectionActionState fails closed when a shared group builder factory returns no builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );
  const context = {
    SlideNextStudioEditorGroup: {
      createStudioGroupSelectionActionStateBuilder() {
        return null;
      }
    },
    getIframeDoc() {
      throw new Error('document should not be read without a usable group builder');
    },
    getStudioSelectedElements() {
      throw new Error('selection should not be read without a usable group builder');
    },
    getActiveSlide() {},
    getLiveSelectedElements() {},
    getSlideMetrics() {},
    getRectOnSlide() {},
    isElementLocked() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildGroupSelectionActionState())),
    {
      slide: null,
      selection: [],
      layoutItems: [],
      parent: null,
      groupPlan: {
        canGroup: false,
        selection: [],
        bounds: null,
        nextItems: []
      },
      canGroup: false
    }
  );
});

test('buildGroupSelectionActionState delegates geometry orchestration to the shared group module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );
  const doc = { id: 'doc' };
  const selection = [{ id: 'node-1' }, { id: 'node-2' }];
  let delegatedOptions = null;
  const context = {
    selectedElements: selection,
    getIframeDoc() {
      return doc;
    },
    SlideNextStudioEditorGroup: {
      buildStudioGroupSelectionActionState(elements, options) {
        delegatedOptions = { elements, options };
        return { canGroup: true };
      }
    },
    getActiveSlide() {},
    getLiveSelectedElements() {},
    getSlideMetrics() {},
    getRectOnSlide() {},
    isElementLocked() {},
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems() {},
      isStudioFreeformPositioned() {}
    },
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {}
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.deepEqual(context.buildGroupSelectionActionState(doc), { canGroup: true });
  assert.match(
    source,
    /buildStudioGroupSelectionActionState\(getStudioSelectedElements\(resolvedDoc\),/
  );
  assert.match(
    source,
    /getLiveSelectedElements\(getStudioSelectedElements\(resolvedDoc\), resolvedDoc\)/
  );
  assert.equal(delegatedOptions.elements, selection);
  assert.equal(delegatedOptions.options.doc, doc);
  assert.equal(delegatedOptions.options.getActiveSlide, context.getActiveSlide);
  assert.equal(delegatedOptions.options.getLiveSelectedElements, context.getLiveSelectedElements);
  assert.equal(delegatedOptions.options.getSlideMetrics, context.getSlideMetrics);
  assert.equal(delegatedOptions.options.getRectOnSlide, context.getRectOnSlide);
  assert.equal(delegatedOptions.options.isLocked, context.isElementLocked);
});

test('buildGroupSelectionActionState prefers canonical lock metadata for grouping', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const source = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );
  const doc = { id: 'doc' };
  const first = { id: 'node-1' };
  const second = { id: 'node-2' };
  let receivedOptions = null;
  const context = {
    selectedElements: [first, second],
    SlideNextStudioEditorCanonicalState: canonicalState,
    getIframeDoc() {
      return doc;
    },
    buildEditorCanonicalDeck() {
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return element === first
        ? { visibility: { locked: true } }
        : { visibility: { locked: false } };
    },
    SlideNextStudioEditorGroup: {
      buildStudioGroupSelectionActionState(elements, options) {
        receivedOptions = options;
        return { canGroup: false };
      }
    },
    getActiveSlide() {},
    getLiveSelectedElements() {},
    getSlideMetrics() {},
    getRectOnSlide() {},
    isElementLocked() {},
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems() {},
      isStudioFreeformPositioned() {}
    },
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {}
    }
  };

  vm.createContext(context);
  vm.runInContext(`${visibilityReaderSource}\n${source}`, context);

  assert.deepEqual(context.buildGroupSelectionActionState(doc), { canGroup: false });
  assert.equal(receivedOptions.isLocked(first), true);
  assert.equal(receivedOptions.isLocked(second), false);
});

test('buildUngroupSelectionActionState delegates group-wrapper filtering to the shared group module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildUngroupSelectionActionState(doc = null) {',
    '\n\n    function updateAlignmentActionState'
  );
  const doc = { id: 'doc' };
  const selection = [{ id: 'group-1' }];
  let delegatedOptions = null;
  const context = {
    selectedElements: selection,
    getIframeDoc() {
      return doc;
    },
    SlideNextStudioEditorGroup: {
      buildStudioUngroupSelectionActionState(elements, options) {
        delegatedOptions = { elements, options };
        return { canUngroup: true };
      }
    },
    getActiveSlide() {},
    getLiveSelectedElements() {},
    isEditorGroupElement() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.deepEqual(context.buildUngroupSelectionActionState(doc), { canUngroup: true });
  assert.match(
    source,
    /buildStudioUngroupSelectionActionState\(getStudioSelectedElements\(resolvedDoc\),/
  );
  assert.match(
    source,
    /getLiveSelectedElements\(getStudioSelectedElements\(resolvedDoc\), resolvedDoc\)/
  );
  assert.equal(delegatedOptions.elements, selection);
  assert.equal(delegatedOptions.options.doc, doc);
  assert.equal(delegatedOptions.options.getActiveSlide, context.getActiveSlide);
  assert.equal(delegatedOptions.options.getLiveSelectedElements, context.getLiveSelectedElements);
  assert.equal(delegatedOptions.options.isEditorGroupElement, context.isEditorGroupElement);
});

test('groupSelectedElements wraps selected children with relative coordinates and records one mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function groupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const calls = [];
  const first = { style: {}, parentElement: null };
  const second = { style: {}, parentElement: null };
  const groupChildren = [];
  const group = {
    style: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    appendChild(child) {
      groupChildren.push(child);
      child.parentElement = this;
    }
  };
  const parent = {
    dataset: { editorId: 'parent-1' },
    innerHTML: '<div data-editor-id="first"></div><div data-editor-id="second"></div>',
    children: [first, second],
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    },
    insertBefore(nextGroup) {
      this.children.unshift(nextGroup);
      this.innerHTML = '<div data-editor-id="group-1"></div>';
      nextGroup.parentElement = this;
    },
    appendChild(nextGroup) {
      this.children.push(nextGroup);
      nextGroup.parentElement = this;
    }
  };
  first.parentElement = parent;
  second.parentElement = parent;
  const slide = { id: 'slide' };
  const context = {
    buildGroupSelectionActionState() {
      return {
        canGroup: true,
        slide,
        parent,
        selection: [first, second],
        groupPlan: {
          bounds: { left: 100, top: 120, width: 280, height: 160 },
          nextItems: [
            { element: first, nextLeft: 0, nextTop: 0 },
            { element: second, nextLeft: 160, nextTop: 100 }
          ]
        }
      };
    },
    updateGroupActionState() {
      calls.push(['updateGroupActionState']);
    },
    getIframeDoc() {
      return {
        createElement() {
          return group;
        }
      };
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    assignEditorElementId(nextGroup) {
      nextGroup.editorId = 'group-1';
    },
    makeElementsHoverable() {
      calls.push(['makeElementsHoverable']);
    },
    commitEditorSelectionState(state) {
      calls.push(['commitEditorSelectionState', state]);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };
  vm.createContext(context);
  loadGroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.groupSelectedElements(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(group.style)), {
    position: 'absolute',
    left: '100px',
    top: '120px',
    width: '280px',
    height: '160px',
    overflow: 'visible',
    boxSizing: 'border-box'
  });
  assert.equal(group['data-editor-group'], 'true');
  assert.equal(group.editorId, 'group-1');
  assert.deepEqual(first.style, {
    position: 'absolute',
    margin: '0',
    left: '0px',
    top: '0px'
  });
  assert.deepEqual(second.style, {
    position: 'absolute',
    margin: '0',
    left: '160px',
    top: '100px'
  });
  assert.equal(first.parentElement, group);
  assert.equal(second.parentElement, group);
  assert.equal(calls[1][0], 'commitEditorSelectionState');
  assert.equal(calls[2][1], 'Auto: Grouped Elements');
  assert.deepEqual(calls[2][2].transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'parent-1',
      before: '<div data-editor-id="first"></div><div data-editor-id="second"></div>',
      after: '<div data-editor-id="group-1"></div>'
    }]
  });
});

test('groupSelectedElements delegates wrapper mutation to the shared group module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function groupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const calls = [];
  const slide = { id: 'slide-1' };
  const parent = {
    id: 'parent-1',
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    }
  };
  const first = { id: 'first' };
  const second = { id: 'second' };
  const group = { id: 'group-1' };
  const context = {
    buildGroupSelectionActionState() {
      return {
        canGroup: true,
        slide,
        parent,
        selection: [first, second],
        groupPlan: {
          bounds: { left: 10, top: 20, width: 100, height: 80 },
          nextItems: []
        }
      };
    },
    SlideNextStudioEditorGroup: {
      applyStudioGroupMutation(options) {
        calls.push(['applyStudioGroupMutation', options]);
        return {
          didApply: true,
          group,
          transaction: { type: 'markup' }
        };
      }
    },
    getIframeDoc() {
      return { id: 'doc' };
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    commitEditorSelectionState(state) {
      calls.push(['commitEditorSelectionState', state]);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadGroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.groupSelectedElements(), true);
  assert.equal(calls[0][0], 'applyStudioGroupMutation');
  assert.equal(calls[0][1].documentRef.id, 'doc');
  assert.equal(calls[0][1].parent, parent);
  assert.deepEqual(calls[0][1].orderedSelection, [first, second]);
  assert.equal(calls[1][0], 'commitEditorSelectionState');
  assert.equal(calls[1][1].selectedElements.length, 1);
  assert.equal(calls[1][1].selectedElements[0], group);
  assert.equal(calls[2][1], 'Auto: Grouped Elements');
  assert.deepEqual(calls[2][2].transaction, { type: 'markup' });
});

test('groupSelectedElements forwards a canonical tree sidecar for grouped nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function groupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const sourceDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1' }, { id: 'node-2' }, { id: 'after' }]
    }]
  });
  const slide = {
    id: 'slide-1',
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    }
  };
  const first = { dataset: { editorId: 'node-1' } };
  const second = { dataset: { editorId: 'node-2' } };
  const group = { dataset: { editorId: 'group-1' } };
  const doc = { id: 'iframe-doc' };
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalGroup: canonicalGroup,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        assert.equal(element, group);
        assert.equal(options.getNodeId(element), 'group-1');
        return {
          id: 'group-1',
          tagName: 'div',
          children: [{ id: 'node-1' }, { id: 'node-2' }]
        };
      }
    },
    SlideNextStudioEditorGroup: {
      applyStudioGroupMutation(options) {
        assert.equal(options.documentRef, doc);
        return { didApply: true, group, transaction: { id: 'tx-group' } };
      }
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return sourceDeck;
    },
    buildGroupSelectionActionState() {
      return {
        canGroup: true,
        slide,
        parent: slide,
        selection: [first, second],
        groupPlan: { bounds: {}, nextItems: [] }
      };
    },
    assignEditorElementId(element) {
      return element && element.dataset && element.dataset.editorId;
    },
    commitEditorSelectionState() {},
    finalizeEditorDeckMutation(label, options) {
      finalized = { label, options };
    },
    getEditorSlideId(currentSlide) {
      assert.equal(currentSlide, slide);
      return 'slide-1';
    },
    getIframeDoc() {
      return doc;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    }
  };

  vm.createContext(context);
  loadGroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.groupSelectedElements(), true);
  assert.equal(finalized.label, 'Auto: Grouped Elements');
  assert.deepEqual(finalized.options.transaction, { id: 'tx-group' });
  assert.deepEqual(finalized.options.canonicalDeck.slides[0].nodes.map((node) => node.id), ['group-1', 'after']);
  assert.deepEqual(finalized.options.canonicalDeck.slides[0].nodes[0].children.map((node) => node.id), ['node-1', 'node-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2', 'after']);
});

test('ungroupSelectedElements restores child positions, removes the wrapper, and records one mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function ungroupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const calls = [];
  const child = {
    style: {},
    getBoundingClientRect() {
      return { left: 110, top: 135, right: 190, bottom: 175 };
    }
  };
  const parent = {
    dataset: { editorId: 'parent-2' },
    innerHTML: '<div data-editor-id="group-1"><div data-editor-id="child-1"></div></div>',
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    },
    insertBefore(element) {
      element.parentElement = this;
      this.innerHTML = '<div data-editor-id="child-1"></div>';
      calls.push(['insertBefore', element]);
    }
  };
  const group = {
    children: [child],
    parentElement: parent,
    getBoundingClientRect() {
      return { left: 100, top: 120, right: 380, bottom: 280 };
    },
    remove() {
      this.removed = true;
      parent.innerHTML = '<div data-editor-id="child-1"></div>';
    }
  };
  const slide = { id: 'slide' };
  const context = {
    buildUngroupSelectionActionState() {
      return {
        canUngroup: true,
        slide,
        groups: [group]
      };
    },
    updateGroupActionState() {
      calls.push(['updateGroupActionState']);
    },
    getIframeDoc() {
      return { id: 'doc' };
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    },
    getRectOnSlide(rect) {
      return rect;
    },
    SlideNextStudioEditorGroup: {
      buildStudioUngroupedLayout(groupBounds, items) {
        assert.deepEqual(groupBounds, {
          left: 100,
          top: 120,
          right: 380,
          bottom: 280
        });
        assert.equal(items[0].relativeLeft, 10);
        assert.equal(items[0].relativeTop, 15);
        return {
          canUngroup: true,
          nextItems: [{ element: child, nextLeft: 110, nextTop: 135 }]
        };
      }
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    commitEditorSelectionState(state) {
      calls.push(['commitEditorSelectionState', state]);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };
  vm.createContext(context);
  loadUngroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.ungroupSelectedElements(), true);
  assert.deepEqual(child.style, {
    position: 'absolute',
    margin: '0',
    left: '110px',
    top: '135px'
  });
  assert.equal(child.parentElement, parent);
  assert.equal(group.removed, true);
  assert.equal(calls[1][0], 'commitEditorSelectionState');
  assert.equal(calls[2][1], 'Auto: Ungrouped Elements');
  assert.deepEqual(calls[2][2].transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'parent-2',
      before: '<div data-editor-id="group-1"><div data-editor-id="child-1"></div></div>',
      after: '<div data-editor-id="child-1"></div>'
    }]
  });
});

test('ungroupSelectedElements delegates wrapper removal to the shared group module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function ungroupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const calls = [];
  const slide = { id: 'slide-1' };
  const child = { id: 'child-1' };
  const group = { id: 'group-1', parentElement: { id: 'parent-1' } };
  const context = {
    buildUngroupSelectionActionState() {
      return {
        canUngroup: true,
        slide,
        groups: [group]
      };
    },
    SlideNextStudioEditorGroup: {
      applyStudioUngroupMutation(options) {
        calls.push(['applyStudioUngroupMutation', options]);
        return {
          didApply: true,
          restoredElements: [child],
          transaction: { type: 'markup' }
        };
      }
    },
    getIframeDoc() {
      return { id: 'doc' };
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    },
    getRectOnSlide(rect) {
      return rect;
    },
    commitEditorSelectionState(state) {
      calls.push(['commitEditorSelectionState', state]);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadUngroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.ungroupSelectedElements(), true);
  assert.equal(calls[0][0], 'applyStudioUngroupMutation');
  assert.deepEqual(calls[0][1].groups, [group]);
  assert.equal(calls[1][0], 'commitEditorSelectionState');
  assert.equal(calls[1][1].selectedElements.length, 1);
  assert.equal(calls[1][1].selectedElements[0], child);
  assert.equal(calls[2][1], 'Auto: Ungrouped Elements');
  assert.deepEqual(calls[2][2].transaction, { type: 'markup' });
});

test('ungroupSelectedElements forwards a canonical tree sidecar for restored children', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function ungroupSelectedElements() {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const sourceDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'group-1', children: [{ id: 'child-1' }, { id: 'child-2' }] }]
    }]
  });
  const slide = { id: 'slide-1' };
  const childOne = { dataset: { editorId: 'child-1' } };
  const childTwo = { dataset: { editorId: 'child-2' } };
  const group = { dataset: { editorId: 'group-1' }, parentElement: slide };
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalGroup: canonicalGroup,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        assert.equal(options.getNodeId(element), element.dataset.editorId);
        return { id: element.dataset.editorId, tagName: 'div' };
      }
    },
    SlideNextStudioEditorGroup: {
      applyStudioUngroupMutation() {
        return {
          didApply: true,
          restoredElements: [childOne, childTwo],
          restoredGroups: [{ group, parent: slide, restoredElements: [childOne, childTwo] }],
          transaction: { id: 'tx-ungroup' }
        };
      }
    },
    assignEditorElementId(element) {
      return element && element.dataset && element.dataset.editorId;
    },
    buildEditorCanonicalDeck() {
      return sourceDeck;
    },
    buildUngroupSelectionActionState() {
      return { canUngroup: true, slide, groups: [group] };
    },
    commitEditorSelectionState() {},
    finalizeEditorDeckMutation(label, options) {
      finalized = { label, options };
    },
    getEditorSlideId(currentSlide) {
      assert.equal(currentSlide, slide);
      return 'slide-1';
    },
    getIframeDoc() {
      return { id: 'doc' };
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getSlideMetrics() {
      return { scaleX: 1 };
    }
  };

  vm.createContext(context);
  loadUngroupMutationHelper(fileContent, context);
  installGroupController(context);
  vm.runInContext(source, context);

  assert.equal(context.ungroupSelectedElements(), true);
  assert.equal(finalized.label, 'Auto: Ungrouped Elements');
  assert.deepEqual(finalized.options.transaction, { id: 'tx-ungroup' });
  assert.deepEqual(finalized.options.canonicalDeck.slides[0].nodes.map((node) => node.id), [
    'child-1', 'child-2'
  ]);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['group-1']);
});
