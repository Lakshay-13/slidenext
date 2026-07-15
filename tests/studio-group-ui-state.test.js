const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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
