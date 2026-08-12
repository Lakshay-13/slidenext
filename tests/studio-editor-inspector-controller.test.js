const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const inspectorController = require('../shared/studio-editor-inspector-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor composes inspector selection synchronization through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorInspectorSelectionSynchronizer =/);
  assert.match(source, /createStudioInspectorSelectionSynchronizer\(/);
  assert.match(source, /getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/);
  assert.match(source, /return typeof studioEditorInspectorSelectionSynchronizer === 'function'/);
  assert.doesNotMatch(source, /syncInspectorForSelection\.synchronizer/);
});

test('syncStudioInspectorActionStates preserves the inspector toolbar refresh order', () => {
  const calls = [];
  const actionNames = [
    'updateAssetLibraryState',
    'updateClipboardActionState',
    'updateRemovalActionState',
    'updateLockActionState',
    'updateVisibilityActionState',
    'updateMotionActionState',
    'updateAlignmentActionState',
    'updateGroupActionState',
    'updateStyleActionState',
    'updateLayerOrderActionState'
  ];

  const options = {};
  actionNames.forEach((name) => {
    options[name] = () => calls.push(name);
  });

  assert.equal(inspectorController.syncStudioInspectorActionStates(options), true);
  assert.deepEqual(calls, actionNames);
});

test('syncStudioInspectorActionStates tolerates optional toolbar callbacks', () => {
  const calls = [];

  assert.equal(inspectorController.syncStudioInspectorActionStates({
    updateClipboardActionState() {
      calls.push('clipboard');
    },
    updateLayerOrderActionState() {
      calls.push('layer-order');
    }
  }), true);
  assert.deepEqual(calls, ['clipboard', 'layer-order']);
});

test('syncStudioInspectorSelection delegates live selection rendering to the shared view', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const selectionState = { hasSelection: true, count: 1 };
  const rgbToHex = () => '#fff';
  const highlightAlignButton = () => {};

  assert.equal(inspectorController.syncStudioInspectorSelection({
    documentRef,
    selectionState,
    inspectorView: {
      syncStudioInspectorSelection(options) {
        calls.push(options);
        return true;
      }
    },
    rgbToHex,
    highlightAlignButton
  }), true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].selectionState, selectionState);
  assert.equal(calls[0].rgbToHex, rgbToHex);
  assert.equal(calls[0].highlightAlignButton, highlightAlignButton);
});

test('syncStudioInspectorSelection returns false when no selection is rendered', () => {
  assert.equal(inspectorController.syncStudioInspectorSelection({
    documentRef: {},
    selectionState: { hasSelection: false },
    inspectorView: {
      renderStudioInspectorSelectionSummary() {
        return { hasSelection: false };
      }
    }
  }), false);
});

test('syncStudioInspectorForSelection refreshes action state before rendering selection', () => {
  const calls = [];

  assert.equal(inspectorController.syncStudioInspectorForSelection({
    updateAssetLibraryState() {
      calls.push('asset');
    },
    updateClipboardActionState() {
      calls.push('actions');
    },
    inspectorView: {
      syncStudioInspectorSelection() {
        calls.push('selection');
        return true;
      }
    },
    selectionState: { hasSelection: true }
  }), true);
  assert.deepEqual(calls, ['asset', 'actions', 'selection']);
});

test('createStudioInspectorSelectionSynchronizer assembles live and canonical selection state', () => {
  const selectedElement = { dataset: { editorId: 'node-1' } };
  const documentRef = { id: 'editor-document' };
  const currentDocument = { id: 'iframe-document' };
  const canonicalDeck = { slides: [{ id: 'slide-1' }] };
  const canonicalNode = { id: 'node-1' };
  const calls = [];
  const sync = inspectorController.createStudioInspectorSelectionSynchronizer({
    liveSelectionApi: {
      buildStudioLiveSelectionState(elements) {
        assert.deepEqual(elements, [selectedElement]);
        return {
          hasSelection: true,
          count: 1,
          primaryElement: selectedElement,
          selection: elements
        };
      }
    },
    inspectorView: {},
    documentRef,
    getSelectedElements: (doc) => {
      assert.equal(doc, currentDocument);
      return [selectedElement];
    },
    getCurrentDocument: () => currentDocument,
    buildCanonicalDeck: (doc) => {
      assert.equal(doc, currentDocument);
      calls.push(['build', doc]);
      return canonicalDeck;
    },
    resolveCanonicalNode: (element, deck) => {
      calls.push(['resolve', element, deck]);
      return canonicalNode;
    },
    inspectorApi: {
      syncStudioInspectorForSelection(options) {
        calls.push(['sync', options]);
        return true;
      }
    },
    updateAssetLibraryState: () => calls.push(['asset'])
  });

  assert.equal(sync(), true);
  assert.deepEqual(calls.map(([name]) => name), ['build', 'resolve', 'sync']);
  assert.equal(calls[1][1], selectedElement);
  assert.equal(calls[1][2], canonicalDeck);
  assert.equal(calls[2][1].documentRef, documentRef);
  assert.equal(calls[2][1].canonicalNode, canonicalNode);
  assert.equal(calls[2][1].updateAssetLibraryState instanceof Function, true);
});

test('createStudioInspectorSelectionSynchronizer fails closed without live selection state', () => {
  const sync = inspectorController.createStudioInspectorSelectionSynchronizer({
    liveSelectionApi: null,
    inspectorView: {}
  });

  assert.equal(sync(), false);
});

test('createStudioInspectorSelectionSynchronizer uses an explicit editor document override', () => {
  const fallbackDocument = { id: 'fallback-document' };
  const explicitDocument = { id: 'explicit-document' };
  const selectedElement = { dataset: { editorId: 'node-1' } };
  let resolvedDocument = null;
  const sync = inspectorController.createStudioInspectorSelectionSynchronizer({
    liveSelectionApi: {
      buildStudioLiveSelectionState(elements) {
        assert.deepEqual(elements, [selectedElement]);
        return { hasSelection: true, primaryElement: selectedElement };
      }
    },
    inspectorView: {},
    getCurrentDocument: () => fallbackDocument,
    getSelectedElements: (doc) => {
      resolvedDocument = doc;
      return [selectedElement];
    },
    inspectorApi: {
      syncStudioInspectorForSelection() {
        return true;
      }
    }
  });

  assert.equal(sync(explicitDocument), true);
  assert.equal(resolvedDocument, explicitDocument);
});
