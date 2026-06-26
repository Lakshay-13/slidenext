const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createControls() {
  return {
    copySelectionBtn: { disabled: true },
    pasteClipboardBtn: { disabled: true },
    slidePasteClipboardBtn: { disabled: true }
  };
}

function getControlStates(controls) {
  return {
    copySelectionBtn: controls.copySelectionBtn.disabled,
    pasteClipboardBtn: controls.pasteClipboardBtn.disabled,
    slidePasteClipboardBtn: controls.slidePasteClipboardBtn.disabled
  };
}

test('updateClipboardActionState enables clipboard controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );

  const controls = createControls();
  const context = {
    selectedElements: [{ id: 'selected' }],
    editorClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements, clipboard, options = {}) {
        return {
          canCopy: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          canPaste: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateClipboardActionStateSource, context);

  context.updateClipboardActionState(null);
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    getElementById() {
      return null;
    }
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    activeSlide: {}
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: false,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });
});
