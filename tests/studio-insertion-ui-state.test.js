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
    addSlideBtn: { disabled: true },
    toolbarInsertHeadingBtn: { disabled: true },
    toolbarInsertParagraphBtn: { disabled: true },
    toolbarInsertImageBtn: { disabled: true },
    toolbarInsertShapeBtn: { disabled: true },
    insertHeadingBtn: { disabled: true },
    insertParagraphBtn: { disabled: true },
    insertImageBtn: { disabled: true },
    insertShapeBtn: { disabled: true },
    insertTableBtn: { disabled: true },
    insertCodeBtn: { disabled: true }
  };
}

function getDisabledStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

test('updateInsertionActionState enables deck-ready insert controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateInsertionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const controls = createControls();
  const context = {
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
  vm.runInContext(updateInsertionActionStateSource, context);

  context.updateInsertionActionState(null);
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: true,
    toolbarInsertHeadingBtn: true,
    toolbarInsertParagraphBtn: true,
    toolbarInsertImageBtn: true,
    toolbarInsertShapeBtn: true,
    insertHeadingBtn: true,
    insertParagraphBtn: true,
    insertImageBtn: true,
    insertShapeBtn: true,
    insertTableBtn: true,
    insertCodeBtn: true
  });

  context.updateInsertionActionState({
    getElementById(id) {
      return id === 'slidesContainer' ? {} : null;
    }
  });
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: false,
    toolbarInsertHeadingBtn: true,
    toolbarInsertParagraphBtn: true,
    toolbarInsertImageBtn: true,
    toolbarInsertShapeBtn: true,
    insertHeadingBtn: true,
    insertParagraphBtn: true,
    insertImageBtn: true,
    insertShapeBtn: true,
    insertTableBtn: true,
    insertCodeBtn: true
  });

  const readyDoc = {
    activeSlide: {},
    getElementById(id) {
      return id === 'slidesContainer' ? {} : null;
    }
  };
  context.updateInsertionActionState(readyDoc);
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: false,
    toolbarInsertHeadingBtn: false,
    toolbarInsertParagraphBtn: false,
    toolbarInsertImageBtn: false,
    toolbarInsertShapeBtn: false,
    insertHeadingBtn: false,
    insertParagraphBtn: false,
    insertImageBtn: false,
    insertShapeBtn: false,
    insertTableBtn: false,
    insertCodeBtn: false
  });
});
