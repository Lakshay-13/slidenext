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
    document: {
      getElementById(id) {
        if (id === 'addSlideBtn') {
          return { disabled: false };
        }
        return null;
      }
    },
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

test('addSlideNode no-ops when the add-slide control is disabled or the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const calls = [];
  const addSlideBtn = { disabled: true };
  const context = {
    document: {
      getElementById(id) {
        if (id === 'addSlideBtn') {
          return addSlideBtn;
        }
        return null;
      }
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(addSlideNodeSource, context);

  context.addSlideNode();
  assert.deepEqual(calls, []);

  addSlideBtn.disabled = false;
  context.addSlideNode();
  assert.deepEqual(calls, [['getIframeDoc']]);
});

test('reorderSlides uses the shared iframe accessor and restores editor state after moving a slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const selectionIds = ['element-1'];
  let slides = [];
  const createSlide = (id) => ({
    id,
    get nextSibling() {
      const index = slides.indexOf(this);
      return index === -1 ? null : slides[index + 1] || null;
    }
  });
  const firstSlide = createSlide('slide-1');
  const secondSlide = createSlide('slide-2');
  const thirdSlide = createSlide('slide-3');
  slides = [firstSlide, secondSlide, thirdSlide];

  const calls = [];
  let restorePayload = null;
  const slidesContainer = {
    insertBefore(node, beforeNode) {
      calls.push(['insertBefore', node, beforeNode]);
      const currentIndex = slides.indexOf(node);
      slides.splice(currentIndex, 1);
      const targetIndex = beforeNode ? slides.indexOf(beforeNode) : slides.length;
      slides.splice(targetIndex, 0, node);
      return node;
    }
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const context = {
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
      }
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-2';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return selectionIds;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
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
  vm.runInContext(reorderSlidesSource, context);

  context.reorderSlides(0, 2);

  assert.deepEqual(slides, [secondSlide, thirdSlide, firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'saveHistoryState',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds',
    'getSlides',
    'insertBefore',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[4][1], iframeDoc);
  assert.equal(calls[5][1], firstSlide);
  assert.equal(calls[5][2], null);
  assert.equal(calls[11][1], 'Auto: Reordered Slides');
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.fallbackIndex, 2);

  restorePayload.restoreActiveSlideById('slide-2');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(2);

  assert.deepEqual(calls.slice(12).map(([name]) => name), [
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[12][1], 'slide-2');
  assert.equal(calls[12][2], iframeDoc);
  assert.equal(calls[12][3].preserveSelection, true);
  assert.equal(calls[13][1], selectionIds);
  assert.equal(calls[13][2], iframeDoc);
  assert.equal(calls[14][1], 2);
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
