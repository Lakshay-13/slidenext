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

test('updateVisibilityActionState enables the visibility control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateVisibilityActionStateSource = extractFunctionSource(
    fileContent,
    'function updateVisibilityActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );

  const toggleVisibilitySelectionBtn = { disabled: true };
  const toggleVisibilitySelectionIcon = { textContent: '' };
  const toggleVisibilitySelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementHidden() {
      return true;
    },
    SlideNextStudioEditorVisibilityState: {
      buildStudioVisibilityActionState(elements, options = {}) {
        const canToggle = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canToggle,
          allHidden: canToggle
        };
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleVisibilitySelectionBtn') return toggleVisibilitySelectionBtn;
        if (id === 'toggleVisibilitySelectionIcon') return toggleVisibilitySelectionIcon;
        if (id === 'toggleVisibilitySelectionLabel') return toggleVisibilitySelectionLabel;
        return null;
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
  vm.runInContext(updateVisibilityActionStateSource, context);

  context.updateVisibilityActionState(null);
  assert.equal(toggleVisibilitySelectionBtn.disabled, true);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility_off');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Hide Selected');

  context.updateVisibilityActionState({
    activeSlide: {}
  });
  assert.equal(toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Show Selected');
});
