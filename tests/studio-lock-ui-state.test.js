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

test('updateLockActionState enables the lock control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLockActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLockActionState(doc = getIframeDoc()) {',
    '\n\n    function updateRemovalActionState(doc = getIframeDoc()) {'
  );

  const toggleLockSelectionBtn = { disabled: true };
  const toggleLockSelectionIcon = { textContent: '' };
  const toggleLockSelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return true;
    },
    SlideNextStudioEditorLockState: {
      buildStudioLockActionState(elements, options = {}) {
        const canToggle = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canToggle,
          allLocked: canToggle
        };
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleLockSelectionBtn') return toggleLockSelectionBtn;
        if (id === 'toggleLockSelectionIcon') return toggleLockSelectionIcon;
        if (id === 'toggleLockSelectionLabel') return toggleLockSelectionLabel;
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
  vm.runInContext(updateLockActionStateSource, context);

  context.updateLockActionState(null);
  assert.equal(toggleLockSelectionBtn.disabled, true);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock');
  assert.equal(toggleLockSelectionLabel.textContent, 'Lock Selected');

  context.updateLockActionState({
    activeSlide: {}
  });
  assert.equal(toggleLockSelectionBtn.disabled, false);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock_open');
  assert.equal(toggleLockSelectionLabel.textContent, 'Unlock Selected');
});
