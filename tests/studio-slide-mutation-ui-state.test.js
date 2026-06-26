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

test('deleteSlideNode uses the shared iframe accessor and restores editor state after removing a slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    function getIframeDoc() {'
  );

  const selectionIds = ['element-1', 'element-2'];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  let slides = [];
  const firstSlide = {
    id: 'slide-1',
    remove() {
      slides = [secondSlide];
    }
  };
  const secondSlide = {
    id: 'slide-2',
    remove() {
      slides = [firstSlide];
    }
  };
  slides = [firstSlide, secondSlide];

  const calls = [];
  let restorePayload = null;
  const context = {
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
      }
    },
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-2';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return selectionIds;
    },
    getEditorSlideId(slide) {
      calls.push(['getEditorSlideId', slide]);
      return slide.id;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    restoreSelectionAfterPreservedSlideMutation(ids, doc) {
      calls.push(['restoreSelectionAfterPreservedSlideMutation', ids, doc]);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  vm.runInContext(deleteSlideNodeSource, context);

  context.deleteSlideNode(1);

  assert.deepEqual(slides, [firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'saveHistoryState',
    'getActiveSlideId',
    'getEditorSlideId',
    'getCommittedSelectedEditorElementIds',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[5][1], iframeDoc);
  assert.equal(calls[11][1], 'Auto: Deleted Slide');
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.removedSlideId, 'slide-2');
  assert.equal(restorePayload.fallbackIndex, 0);

  restorePayload.restoreActiveSlideById('slide-1');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(0);

  assert.deepEqual(calls.slice(12).map(([name]) => name), [
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[12][1], 'slide-1');
  assert.equal(calls[12][2], iframeDoc);
  assert.equal(calls[12][3].preserveSelection, true);
  assert.equal(calls[13][1], selectionIds);
  assert.equal(calls[13][2], iframeDoc);
  assert.equal(calls[14][1], 0);
});
