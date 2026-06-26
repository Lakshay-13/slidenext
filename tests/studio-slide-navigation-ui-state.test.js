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
