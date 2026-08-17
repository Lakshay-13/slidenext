const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const selectionController = require('../shared/studio-editor-clipboard-selection-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard selection controller delegates shared selection planning with canonical locks', () => {
  const documentRef = { id: 'editor-document' };
  const elements = [{ id: 'element-1' }];
  const clipboard = { items: [{ id: 'item-1' }] };
  const lockedReader = () => true;
  const payloadItems = [{ id: 'payload-1' }];
  let delegated = null;
  const controller = selectionController.createStudioEditorClipboardSelectionController({
    clipboardApi: {
      buildStudioClipboardSelectionMutationPlan(currentElements, currentClipboard, options) {
        delegated = { currentElements, currentClipboard, options };
        return { canCopy: true, canDuplicate: true, payloadItems, canBuildPayload: true };
      }
    },
    getIframeDoc: () => documentRef,
    getActiveSlide: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return { id: 'slide-1' };
    },
    getSelectedElements: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return elements;
    },
    getClipboard: () => clipboard,
    isElementLocked: () => false,
    getCanonicalVisibilityReader: (kind, currentDocument, fallback) => {
      assert.equal(kind, 'locked');
      assert.equal(currentDocument, documentRef);
      assert.equal(typeof fallback, 'function');
      return lockedReader;
    },
    buildPayload: (selectedElements, currentDocument) => {
      assert.equal(selectedElements, elements);
      assert.equal(currentDocument, documentRef);
      return payloadItems;
    }
  });

  assert.deepEqual(controller.build(documentRef), {
    canCopy: true,
    canDuplicate: true,
    payloadItems,
    canBuildPayload: true
  });
  assert.equal(delegated.currentElements, elements);
  assert.equal(delegated.currentClipboard, clipboard);
  assert.equal(delegated.options.isLocked, lockedReader);
  assert.equal(delegated.options.canMutateDeck(), true);
  assert.deepEqual(delegated.options.buildPayloadItems(elements), payloadItems);
});

test('clipboard selection controller preserves the legacy shared-plan fallback', () => {
  const payloadItems = [{ id: 'payload-1' }];
  const controller = selectionController.createStudioEditorClipboardSelectionController({
    clipboardApi: {
      buildStudioClipboardMutationPlan() {
        return {
          selection: [{ id: 'element-1' }],
          canCopy: true,
          canDuplicate: true,
          canPaste: false
        };
      }
    },
    getActiveSlide: () => ({ id: 'slide-1' }),
    getSelectedElements: (currentDocument) => {
      assert.deepEqual(currentDocument, { id: 'editor-document' });
      return [{ id: 'element-1' }];
    },
    buildPayload: () => payloadItems
  });

  assert.deepEqual(controller.build({ id: 'editor-document' }), {
    selection: [{ id: 'element-1' }],
    canCopy: true,
    canDuplicate: true,
    canPaste: false,
    payloadItems,
    canBuildPayload: true
  });
});

test('clipboard selection controller fails closed without clipboard APIs', () => {
  const controller = selectionController.createStudioEditorClipboardSelectionController({});

  assert.deepEqual(controller.build(), {
    selection: [],
    canCopy: false,
    canDuplicate: false,
    canPaste: false,
    payloadItems: [],
    canBuildPayload: false
  });
});

test('editor routes clipboard selection planning through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const compositionSource = fs.readFileSync(
    path.join(__dirname, '..', 'shared/studio-editor-clipboard-selection-shell-composition.js'),
    'utf8'
  );

  assert.match(source, /SlideNextStudioEditorClipboardSelectionShellComposition/);
  assert.match(compositionSource, /SlideNextStudioEditorClipboardSelectionController/);
  assert.match(source, /studioEditorClipboardSelectionController\.build\(doc\)/);
});
