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

test('initStudioFrame refreshes inspector state after bootstrapping the iframe', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );

  const iframeDoc = {
    listeners: [],
    addEventListener(type, handler, capture) {
      this.listeners.push({ type, handler, capture });
    }
  };

  const calls = {
    syncIframeTheme: 0,
    ensureStudioEditorStyle: 0,
    makeElementsHoverable: 0,
    clickHandlerFactory: 0,
    keydownHandlerFactory: 0,
    frameBootstrap: 0,
    updateInsertionActionState: 0,
    updateWallpaperActionState: 0,
    updateDeckReadyToolbarActionState: 0,
    setStudioAutoSaveStatus: [],
    syncInspectorForSelection: 0
  };

  const context = {
    document: {
      getElementById(id) {
        if (id === 'studioFrame') {
          return {
            contentDocument: iframeDoc,
            contentWindow: { document: iframeDoc }
          };
        }
        return null;
      }
    },
    syncIframeTheme() {
      calls.syncIframeTheme += 1;
    },
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle(doc) {
        assert.equal(doc, iframeDoc);
        calls.ensureStudioEditorStyle += 1;
      }
    },
    makeElementsHoverable(doc) {
      assert.equal(doc, iframeDoc);
      calls.makeElementsHoverable += 1;
    },
    SlideNextStudioEditorEvents: {
      createStudioFrameClickHandler() {
        calls.clickHandlerFactory += 1;
        return function clickHandler() {};
      },
      createStudioFrameKeydownHandler() {
        calls.keydownHandlerFactory += 1;
        return function keydownHandler() {};
      }
    },
    isDraggingElement: false,
    resolveEditableTarget() {},
    selectElement() {},
    deselectElement() {},
    editorUndo() {},
    editorRedo() {},
    selectedElements: [],
    arrangeElementLayer() {},
    removeSelectedElement() {},
    copySelectedElements() {},
    pasteClipboardElements() {},
    duplicateSelectedElements() {},
    nudgeSelectedElements() {},
    selectAllElementsOnActiveSlide() {},
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        assert.equal(typeof options.captureInitialHistoryState, 'function');
        calls.frameBootstrap += 1;
        return {
          didSyncActiveSlide: true
        };
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    saveHistoryState() {},
    capturePersistedDeckPlaybackState() {
      return {};
    },
    buildPersistableDeckHtml() {
      return '<html></html>';
    },
    persistedDeckPlaybackState: null,
    lastPersistedDeckHtml: '',
    updateInsertionActionState() {
      calls.updateInsertionActionState += 1;
    },
    updateWallpaperActionState() {
      calls.updateWallpaperActionState += 1;
    },
    updateDeckReadyToolbarActionState() {
      calls.updateDeckReadyToolbarActionState += 1;
    },
    setStudioAutoSaveStatus(state) {
      calls.setStudioAutoSaveStatus.push(state);
    },
    syncInspectorForSelection() {
      calls.syncInspectorForSelection += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  context.initStudioFrame();

  assert.deepEqual(calls, {
    syncIframeTheme: 1,
    ensureStudioEditorStyle: 1,
    makeElementsHoverable: 1,
    clickHandlerFactory: 1,
    keydownHandlerFactory: 1,
    frameBootstrap: 1,
    updateInsertionActionState: 1,
    updateWallpaperActionState: 1,
    updateDeckReadyToolbarActionState: 1,
    setStudioAutoSaveStatus: ['saved'],
    syncInspectorForSelection: 1
  });
  assert.equal(iframeDoc.listeners.length, 2);
  assert.deepEqual(iframeDoc.listeners.map((listener) => listener.type), ['click', 'keydown']);
});
