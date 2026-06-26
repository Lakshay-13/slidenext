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

test('setActiveSlide reads the live frame through the shared iframe accessor and forwards the requested options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setActiveSlideSource = extractFunctionSource(
    fileContent,
    'function setActiveSlide(index, options = {}) {',
    '\n\n    // Sync presentation\'s internal dots and counter'
  );

  const iframeDoc = { id: 'doc' };
  let capturedCall = null;
  let getIframeDocCalls = 0;
  const context = {
    getIframeDoc() {
      getIframeDocCalls += 1;
      return iframeDoc;
    },
    getSlides() {},
    SlideNextStudioDeckView: {
      setStudioDeckActiveSlide(index, options) {
        capturedCall = { index, options };
      }
    },
    syncStudioChromeToActiveSlide() {}
  };

  vm.createContext(context);
  vm.runInContext(setActiveSlideSource, context);

  context.setActiveSlide(3, { captureHistory: true, preserveSelection: true });

  assert.equal(getIframeDocCalls, 1);
  assert.equal(capturedCall.index, 3);
  assert.equal(capturedCall.options.doc, iframeDoc);
  assert.equal(capturedCall.options.captureHistory, true);
  assert.equal(capturedCall.options.preserveSelection, true);
  assert.equal(capturedCall.options.getSlides, context.getSlides);
  assert.equal(capturedCall.options.syncStudioChromeToActiveSlide, context.syncStudioChromeToActiveSlide);
});

test('bindDeckNavigationSync reads the live frame window through the shared iframe accessor', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const bindDeckNavigationSyncSource = extractFunctionSource(
    fileContent,
    'function bindDeckNavigationSync(doc = getIframeDoc()) {',
    '\n\n    function teardownDeckActiveSlideSync() {'
  );

  const iframeDoc = { id: 'doc' };
  const iframeWindow = { id: 'window' };
  let capturedCall = null;
  let getIframeDocCalls = 0;
  let getIframeWindowCalls = 0;
  const context = {
    getIframeDoc() {
      getIframeDocCalls += 1;
      return iframeDoc;
    },
    getIframeWindow() {
      getIframeWindowCalls += 1;
      return iframeWindow;
    },
    SlideNextStudioDeckView: {
      bindStudioDeckNavigationSync(doc, frameWin, options) {
        capturedCall = { doc, frameWin, options };
        return true;
      }
    },
    syncStudioChromeToActiveSlide() {}
  };

  vm.createContext(context);
  vm.runInContext(bindDeckNavigationSyncSource, context);

  const result = context.bindDeckNavigationSync();

  assert.equal(result, true);
  assert.equal(getIframeDocCalls, 1);
  assert.equal(getIframeWindowCalls, 1);
  assert.equal(capturedCall.doc, iframeDoc);
  assert.equal(capturedCall.frameWin, iframeWindow);
  assert.equal(typeof capturedCall.options.getSyncStudioChromeOptions, 'function');
  assert.equal(capturedCall.options.syncStudioChromeToActiveSlide, context.syncStudioChromeToActiveSlide);
  assert.equal(capturedCall.options.getSyncStudioChromeOptions().captureHistory, true);
});

test('syncStudioChromeToActiveSlide routes active slide index updates through the shared session-state helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slideCountLabel');
      return {
        textContent: ''
      };
    }
  };
  const calls = [];
  const context = {
    currentSlideIndex: 1,
    deselectElement() {
      calls.push(['deselectElement']);
    },
    document: {
      getElementById(id) {
        assert.equal(id, 'slideCountLabel');
        return {
          textContent: ''
        };
      }
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        calls.push(['syncStudioActiveSlideView', doc]);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  const didSync = context.syncStudioChromeToActiveSlide();

  assert.equal(didSync, true);
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(calls[0][0], 'syncStudioActiveSlideView');
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[1][0], 'updateCurrentPresentationSessionState');
  assert.equal(calls[1][1].slideIndex, 4);
});
