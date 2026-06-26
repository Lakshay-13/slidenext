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

test('addSlideNode uses the shared iframe accessor and appends a new blank slide before refreshing editor state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const existingSlide = { id: 'slide-1' };
  const newSlide = { id: 'slide-2' };
  const slides = [existingSlide];
  const slidesContainer = {
    appendChild(node) {
      slides.push(node);
      return node;
    }
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const calls = [];
  const context = {
    assignEditorSlideId() {},
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getEditorDomOptions() {
      calls.push(['getEditorDomOptions']);
      return {};
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    makeElementsHoverable() {},
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    SlideNextStudioEditorDom: {
      createStudioBlankSlide(doc, options) {
        calls.push(['createStudioBlankSlide', doc, options]);
        assert.equal(doc, iframeDoc);
        assert.equal(options.decorateSlide, context.makeElementsHoverable);
        assert.equal(options.assignSlideId, context.assignEditorSlideId);
        return newSlide;
      }
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  vm.runInContext(addSlideNodeSource, context);

  context.addSlideNode();

  assert.deepEqual(slides, [existingSlide, newSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'saveHistoryState',
    'getSlides',
    'getEditorDomOptions',
    'createStudioBlankSlide',
    'generateThumbnails',
    'setActiveSlide',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.equal(calls[4][1], iframeDoc);
  assert.equal(calls[6][1], 1);
  assert.equal(calls[9][1], 'Auto: Added Slide');
});
