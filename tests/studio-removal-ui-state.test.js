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

test('updateRemovalActionState enables the delete control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function updateVisibilityActionState(doc = getIframeDoc()) {'
  );

  const removeSelectionBtn = { disabled: true };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState(elements, options = {}) {
        return {
          canRemove: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    document: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
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
  vm.runInContext(updateRemovalActionStateSource, context);

  context.updateRemovalActionState(null);
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    getElementById() {
      return null;
    }
  });
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    activeSlide: {}
  });
  assert.equal(removeSelectionBtn.disabled, false);
});
