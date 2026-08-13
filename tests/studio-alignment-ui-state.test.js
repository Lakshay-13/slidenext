const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalLayout = require('../shared/studio-editor-canonical-layout.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioAlignment = require('../shared/studio-editor-alignment.js');
const alignmentController = require('../shared/studio-editor-alignment-controller.js');
const positionLayoutMutation = require('../shared/studio-editor-position-layout-mutation.js');
const positionLayoutTransaction = require('../shared/studio-editor-position-layout-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadPositionMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorPositionLayoutWithTransaction(nextItems, options = {}) {',
    'function alignSelectedElements(action = \'\') {'
  );
  if (!context.SlideNextStudioEditorTransaction) {
    context.SlideNextStudioEditorTransaction = studioTransaction;
  }
  context.SlideNextStudioEditorPositionLayoutMutation = positionLayoutMutation;
  context.SlideNextStudioEditorPositionLayoutTransaction = positionLayoutTransaction;
  vm.runInContext(helperSource, context);
}

function installAlignmentController(context) {
  context.studioEditorAlignmentController = alignmentController.createStudioEditorAlignmentController({
    alignmentApi: context.SlideNextStudioEditorAlignment,
    canonicalLayoutApi: context.SlideNextStudioEditorCanonicalLayout,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    buildAlignmentActionState: context.buildAlignmentActionState,
    updateAlignmentActionState: context.updateAlignmentActionState,
    getIframeDoc: context.getIframeDoc,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    applyPositionLayout: context.applyEditorPositionLayoutWithTransaction,
    finalizeDeckMutation: context.finalizeEditorDeckMutation
  });
}

test('buildAlignmentActionState reuses valid nudge layout geometry for alignment readiness', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildAlignmentActionState(doc = null) {',
    '\n\n    function updateAlignmentActionState'
  );
  const layoutItems = [{ element: { id: 'first' } }, { element: { id: 'second' } }];
  const slide = { id: 'slide-1' };
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignmentActionState(items, options) {
        assert.equal(items, layoutItems);
        assert.equal(options.canMutateDeck(), true);
        return { selection: items, canAlign: true };
      }
    },
    buildMotionSelectionActionState(doc) {
      assert.equal(doc, context.doc);
      return {
        doc,
        slide,
        canNudge: true,
        nudgeLayoutItems: layoutItems
      };
    },
    isElementLocked() {}
  };
  context.doc = { id: 'doc' };
  vm.createContext(context);
  vm.runInContext(source, context);

  const result = context.buildAlignmentActionState(context.doc);
  assert.equal(result.alignmentActionState.canAlign, true);
  assert.equal(result.nudgeLayoutItems, layoutItems);
});

test('buildAlignmentActionState fails closed when the shared alignment runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildAlignmentActionState(doc = null) {',
    '\n\n    function updateAlignmentActionState'
  );
  const context = {
    buildMotionSelectionActionState() {
      return {
        slide: { id: 'slide-1' },
        nudgeLayoutItems: [{ element: { id: 'node-1' } }],
        canNudge: true
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  const result = context.buildAlignmentActionState();
  assert.equal(result.canNudge, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.alignmentActionState.selection)), []);
  assert.equal(result.alignmentActionState.canAlign, false);
});

test('updateAlignmentActionState enables all positional controls only when alignment is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAlignmentActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState'
  );
  const ids = [
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn',
    'distributeSelectionHorizontalBtn',
    'distributeSelectionVerticalBtn'
  ];
  const controls = Object.fromEntries(ids.map((id) => [id, { disabled: true }]));
  const context = {
    SlideNextStudioEditorAlignment: {
      ...studioAlignment,
      createStudioAlignmentToolbarStateSync: null
    },
    buildMotionSelectionActionState() {
      return {
        slide: { id: 'slide-1' },
        canNudge: true,
        nudgeLayoutItems: [{}, {}, {}]
      };
    },
    isElementLocked() {
      return false;
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.updateAlignmentActionState({ id: 'doc' });

  ids.forEach((id) => assert.equal(controls[id].disabled, false));
});

test('updateAlignmentActionState delegates toolbar state assembly to the shared alignment view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAlignmentActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState'
  );
  const slide = { id: 'slide-1' };
  const layoutItems = [{ element: {} }, { element: {} }];
  const calls = [];
  const doc = { id: 'doc' };
  const context = {
    SlideNextStudioEditorAlignment: {
      syncStudioAlignmentToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    buildMotionSelectionActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return {
        slide,
        canNudge: true,
        nudgeLayoutItems: layoutItems
      };
    },
    document: {},
    isElementLocked() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateAlignmentActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].items, layoutItems);
  assert.equal(calls[0].isLocked, context.isElementLocked);
  assert.equal(calls[0].canMutateDeck(), true);
});

test('updateAlignmentActionState caches the shared alignment toolbar synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAlignmentActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState'
  );
  const doc = { id: 'doc' };
  const calls = [];
  const context = {
    buildAlignmentActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return {
        alignmentActionState: {
          selection: [{}, {}],
          canAlign: true
        }
      };
    },
    SlideNextStudioEditorAlignment: {
      syncStudioAlignmentToolbarState() {
        throw new Error('direct alignment sync should not run');
      },
      createStudioAlignmentToolbarStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).alignmentActionState.canAlign;
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

  assert.equal(context.updateAlignmentActionState(doc), true);
  assert.equal(context.updateAlignmentActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'action-state').map(([, currentDoc]) => currentDoc), [doc, doc]);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('alignment action state prefers canonical lock metadata when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const source = extractFunctionSource(
    fileContent,
    'function buildAlignmentActionState(doc = null) {',
    '\n\n    function updateAlignmentActionState'
  );
  const doc = { id: 'doc' };
  const element = { dataset: { editorId: 'node-1' } };
  const layoutItems = [{ element }, { element: { dataset: { editorId: 'node-2' } } }];
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'node-1', visibility: { locked: true } },
        { id: 'node-2', visibility: { locked: false } }
      ]
    }]
  });
  const calls = [];
  const context = {
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorAlignment: {
      buildStudioAlignmentActionState(items, options) {
        calls.push({ items, locked: options.isLocked(element) });
        return { selection: items, canAlign: false };
      }
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return canonicalDeck;
    },
    buildMotionSelectionActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return {
        doc,
        slide: { id: 'slide-1' },
        canNudge: true,
        nudgeLayoutItems: layoutItems
      };
    },
    getIframeDoc() {
      return doc;
    },
    resolveEditorCanonicalNodeForElement(target, deck) {
      return deck.slides[0].nodes.find((node) => node.id === target.dataset.editorId) || null;
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${visibilityReaderSource}\n${source}`, context);

  context.buildAlignmentActionState(doc);
  assert.deepEqual(calls, [{ items: layoutItems, locked: true }]);
});

test('distributeSelectedElements writes distribution positions and records one mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function distributeSelectedElements(axis = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { style: {} };
  const second = { style: {} };
  const third = { style: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioDistributedLayout(selection, axis) {
        calls.push(['buildStudioDistributedLayout', selection, axis]);
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 10, nextTop: 20 },
            { element: second, nextLeft: 30, nextTop: 40 },
            { element: third, nextLeft: 50, nextTop: 60 }
          ]
        };
      }
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }, { element: third }]
        }
      };
    },
    updateAlignmentActionState() {
      calls.push(['updateAlignmentActionState']);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };
  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.distributeSelectedElements('horizontal'), true);
  assert.deepEqual(JSON.parse(JSON.stringify({ first, second, third })), {
    first: { style: { left: '10px', top: '20px' } },
    second: { style: { left: '30px', top: '40px' } },
    third: { style: { left: '50px', top: '60px' } }
  });
  assert.equal(calls[0][0], 'buildStudioDistributedLayout');
  assert.equal(calls[0][2], 'horizontal');
  assert.equal(calls[1][1], 'Auto: Distributed horizontal');
});

test('distributeSelectedElements forwards an immutable canonical layout sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function distributeSelectedElements(axis = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { dataset: { editorId: 'node-1' }, style: {} };
  const second = { dataset: { editorId: 'node-2' }, style: {} };
  const third = { dataset: { editorId: 'node-3' }, style: {} };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'node-1', layout: { mode: 'absolute', x: 10, y: 20 } },
        { id: 'node-2', layout: { mode: 'absolute', x: 40, y: 50 } },
        { id: 'node-3', layout: { mode: 'absolute', x: 80, y: 90 } }
      ]
    }]
  });
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalLayout: canonicalLayout,
    SlideNextStudioEditorAlignment: {
      buildStudioDistributedLayout() {
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 10, nextTop: 20, nextAbsLeft: 10, nextAbsTop: 20 },
            { element: second, nextLeft: 50, nextTop: 60, nextAbsLeft: 50, nextAbsTop: 60 },
            { element: third, nextLeft: 90, nextTop: 100, nextAbsLeft: 90, nextAbsTop: 100 }
          ]
        };
      }
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }, { element: third }]
        }
      };
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    },
    finalizeEditorDeckMutation(label, options) {
      finalized = { label, options };
    },
    updateAlignmentActionState() {}
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.distributeSelectedElements('horizontal'), true);
  assert.equal(first.style.left, '10px');
  assert.equal(second.style.left, '50px');
  assert.equal(canonicalDeckBefore.slides[0].nodes[1].layout.x, 40);
  assert.equal(finalized.label, 'Auto: Distributed horizontal');
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[1].layout.x, 50);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[2].layout.y, 100);
});

test('alignSelectedElements writes aligned parent-relative positions and records one mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function alignSelectedElements(action = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { style: {} };
  const second = { style: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignedLayout(selection, action) {
        calls.push(['buildStudioAlignedLayout', selection, action]);
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 40, nextTop: 50 },
            { element: second, nextLeft: 70, nextTop: 80 }
          ]
        };
      }
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }]
        }
      };
    },
    updateAlignmentActionState() {
      calls.push(['updateAlignmentActionState']);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };
  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.alignSelectedElements('middle'), true);
  assert.deepEqual(JSON.parse(JSON.stringify({ first, second })), {
    first: { style: { left: '40px', top: '50px' } },
    second: { style: { left: '70px', top: '80px' } }
  });
  assert.equal(calls[0][0], 'buildStudioAlignedLayout');
  assert.equal(calls[0][2], 'middle');
  assert.equal(calls[1][0], 'finalizeEditorDeckMutation');
  assert.equal(calls[1][1], 'Auto: Aligned middle');
  assert.equal(calls[1][2].syncSelectionOverlay, true);
});

test('alignSelectedElements forwards a reversible position transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function alignSelectedElements(action = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { dataset: { editorId: 'node-1' }, style: { left: '10px', top: '20px' } };
  const second = { dataset: { editorId: 'node-2' }, style: { left: '30px', top: '40px' } };
  let finalizedOptions = null;
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 40, nextTop: 50 },
            { element: second, nextLeft: 70, nextTop: 80 }
          ]
        };
      }
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }]
        }
      };
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    finalizeEditorDeckMutation(label, options) {
      finalizedOptions = { label, options };
    },
    updateAlignmentActionState() {}
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.alignSelectedElements('middle'), true);
  assert.deepEqual(finalizedOptions.options.transaction, {
    kind: studioTransaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: studioTransaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [
      {
        type: 'style',
        elementId: 'node-1',
        before: { left: '10px', top: '20px' },
        after: { left: '40px', top: '50px' }
      },
      {
        type: 'style',
        elementId: 'node-2',
        before: { left: '30px', top: '40px' },
        after: { left: '70px', top: '80px' }
      }
    ]
  });
});

test('alignSelectedElements forwards an immutable canonical layout sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function alignSelectedElements(action = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { dataset: { editorId: 'node-1' }, style: {} };
  const second = { dataset: { editorId: 'node-2' }, style: {} };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'node-1', layout: { mode: 'absolute', x: 10, y: 20 } },
        { id: 'node-2', layout: { mode: 'absolute', x: 90, y: 100 } }
      ]
    }]
  });
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalLayout: canonicalLayout,
    SlideNextStudioEditorAlignment: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 40, nextTop: 50, nextAbsLeft: 40, nextAbsTop: 50 },
            { element: second, nextLeft: 70, nextTop: 80, nextAbsLeft: 70, nextAbsTop: 80 }
          ]
        };
      }
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }]
        }
      };
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    },
    finalizeEditorDeckMutation(label, options) {
      finalized = { label, options };
    },
    updateAlignmentActionState() {}
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.alignSelectedElements('middle'), true);
  assert.equal(first.style.left, '40px');
  assert.equal(second.style.top, '80px');
  assert.equal(canonicalDeckBefore.slides[0].nodes[0].layout.x, 10);
  assert.equal(finalized.label, 'Auto: Aligned middle');
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[0].layout.x, 40);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[1].layout.y, 80);
});

test('alignSelectedElements delegates position application to the shared alignment module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function alignSelectedElements(action = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { style: {} };
  const second = { style: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignedLayout() {
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 40, nextTop: 50 },
            { element: second, nextLeft: 70, nextTop: 80 }
          ]
        };
      },
      applyStudioAlignmentLayout(items, options) {
        calls.push(['applyStudioAlignmentLayout', items, options]);
        items.forEach((item) => {
          item.element.style.left = `${item.nextLeft}px`;
          item.element.style.top = `${item.nextTop}px`;
        });
        return { didApply: true, transaction: { type: 'position' } };
      }
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }]
        }
      };
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    },
    updateAlignmentActionState() {}
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.alignSelectedElements('middle'), true);
  assert.deepEqual(first.style, { left: '40px', top: '50px' });
  assert.equal(calls[1][0], 'finalizeEditorDeckMutation');
  assert.deepEqual(calls[1][2].transaction, { type: 'position' });
});

test('distributeSelectedElements delegates position application to the shared alignment module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function distributeSelectedElements(axis = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { style: {} };
  const second = { style: {} };
  const third = { style: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioDistributedLayout() {
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 10, nextTop: 20 },
            { element: second, nextLeft: 30, nextTop: 40 },
            { element: third, nextLeft: 50, nextTop: 60 }
          ]
        };
      },
      applyStudioAlignmentLayout(items, options) {
        calls.push(['applyStudioAlignmentLayout', items, options]);
        items.forEach((item) => {
          item.element.style.left = `${item.nextLeft}px`;
          item.element.style.top = `${item.nextTop}px`;
        });
        return { didApply: true, transaction: { type: 'position' } };
      }
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }, { element: third }]
        }
      };
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    },
    updateAlignmentActionState() {}
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installAlignmentController(context);
  vm.runInContext(source, context);

  assert.equal(context.distributeSelectedElements('horizontal'), true);
  assert.deepEqual(third.style, { left: '50px', top: '60px' });
  assert.equal(calls[0][0], 'applyStudioAlignmentLayout');
  assert.equal(calls[1][0], 'finalizeEditorDeckMutation');
  assert.deepEqual(calls[1][2].transaction, { type: 'position' });
});
