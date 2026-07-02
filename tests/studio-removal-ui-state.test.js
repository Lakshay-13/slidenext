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

test('removeSelectedElement returns false and skips persistence when planned targets disconnect before removal', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const disconnectedTarget = {
    isConnected: false,
    remove() {
      throw new Error('remove should not run for disconnected targets');
    }
  };
  const calls = [];
  const context = {
    selectedElements: [disconnectedTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [disconnectedTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState']
  ]);
});

test('removeSelectedElement returns true after removing live targets and persisting the change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const liveTarget = {
    isConnected: true,
    removeCalls: 0,
    remove() {
      this.removeCalls += 1;
      this.isConnected = false;
    }
  };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(liveTarget.removeCalls, 1);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['deselectElement'],
    ['generateThumbnails'],
    ['updateLayersList'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Deleted Element']
  ]);
});
