const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioAlignment = require('../shared/studio-editor-alignment.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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
    SlideNextStudioEditorAlignment: studioAlignment,
    buildAlignmentActionState() {
      return { alignmentActionState: { canAlign: true, selection: [{}, {}, {}] } };
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
  const context = {
    SlideNextStudioEditorAlignment: {
      syncStudioAlignmentToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    buildAlignmentActionState() {
      return {
        slide,
        canNudge: true,
        nudgeLayoutItems: layoutItems,
        alignmentActionState: {
          selection: layoutItems,
          canAlign: true
        }
      };
    },
    document: {},
    isElementLocked() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  const doc = { id: 'doc' };
  assert.equal(context.updateAlignmentActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].items, layoutItems);
  assert.equal(calls[0].isLocked, context.isElementLocked);
  assert.equal(calls[0].canMutateDeck(), true);
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
  vm.runInContext(source, context);

  assert.equal(context.distributeSelectedElements('horizontal'), true);
  assert.deepEqual(third.style, { left: '50px', top: '60px' });
  assert.equal(calls[0][0], 'applyStudioAlignmentLayout');
  assert.equal(calls[1][0], 'finalizeEditorDeckMutation');
  assert.deepEqual(calls[1][2].transaction, { type: 'position' });
});
