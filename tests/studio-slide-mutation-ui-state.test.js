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

function loadFinalizeSlideMutationPersistence(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeSlideMutationPersistence(versionLabel) {',
    '\n\n    function captureSlideMutationRestoreState(iframeDoc) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCaptureSlideMutationRestoreState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureSlideMutationRestoreState(iframeDoc) {',
    '\n\n    function restoreDeckViewAfterSlideMutation(iframeDoc, preservedSelectionIds, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadRestoreDeckViewAfterSlideMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function restoreDeckViewAfterSlideMutation(iframeDoc, preservedSelectionIds, options = {}) {',
    '\n\n    // Add Blank Slide Node'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioInsertionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateInsertionActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

test('finalizeSlideMutationPersistence saves, autosaves, and versions slide changes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);

  const result = context.finalizeSlideMutationPersistence('Auto: Added Slide');

  assert.equal(result, 'Auto: Added Slide');
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Added Slide']
  ]);
});

test('captureSlideMutationRestoreState snapshots the active slide id and committed selection after saving history', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-3';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return ['node-1', 'node-2'];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadCaptureSlideMutationRestoreState(fileContent, context);

  const result = context.captureSlideMutationRestoreState(iframeDoc);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    preservedActiveSlideId: 'slide-3',
    preservedSelectionIds: ['node-1', 'node-2']
  });
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['getActiveSlideId', iframeDoc],
    ['getCommittedSelectedEditorElementIds', iframeDoc]
  ]);
});

test('restoreDeckViewAfterSlideMutation delegates slide restore callbacks through shared selection and navigation helpers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const selectionIds = ['node-1', 'node-2'];
  let restorePayload = null;
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
        return { restored: true };
      }
    },
    restoreSelectionAfterPreservedSlideMutation(ids, doc) {
      calls.push(['restoreSelectionAfterPreservedSlideMutation', ids, doc]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
    },
    Object
  };

  vm.createContext(context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);

  const result = context.restoreDeckViewAfterSlideMutation(iframeDoc, selectionIds, {
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-1',
    fallbackIndex: 1
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { restored: true });
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.removedSlideId, 'slide-1');
  assert.equal(restorePayload.fallbackIndex, 1);

  restorePayload.restoreActiveSlideById('slide-2');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(1);

  assert.deepEqual(calls.map(([name]) => name), [
    'restoreStudioDeckViewAfterSlideMutation',
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[1][1], 'slide-2');
  assert.equal(calls[1][2], iframeDoc);
  assert.equal(calls[1][3].preserveSelection, true);
  assert.deepEqual(calls[2][1], selectionIds);
  assert.equal(calls[2][2], iframeDoc);
  assert.equal(calls[3][1], 1);
});

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
    getActiveSlide() {
      return null;
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
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  vm.runInContext(addSlideNodeSource, context);

  const result = context.addSlideNode();

  assert.equal(result, true);
  assert.deepEqual(slides, [existingSlide, newSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'getEditorDomOptions',
    'createStudioBlankSlide',
    'saveHistoryState',
    'generateThumbnails',
    'setActiveSlide',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[6][1], 1);
  assert.equal(calls[9][1], 'Auto: Added Slide');
});

test('addSlideNode no-ops when insertion state or the iframe document disallows adding slides', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const calls = [];
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    getActiveSlide() {
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  vm.runInContext(addSlideNodeSource, context);

  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls, [['getIframeDoc']]);

  context.getIframeDoc = () => {
    calls.push(['getIframeDoc']);
    return {
      getElementById(id) {
        assert.equal(id, 'slidesContainer');
        return null;
      }
    };
  };
  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getIframeDoc']
  ]);
});

test('addSlideNode skips history when blank slide creation fails', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
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
    getActiveSlide() {
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [{ id: 'slide-1' }];
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
        return null;
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
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  vm.runInContext(addSlideNodeSource, context);

  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'getEditorDomOptions',
    'createStudioBlankSlide'
  ]);
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
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(reorderSlidesSource, context);

  context.reorderSlides(0, 2);

  assert.deepEqual(slides, [secondSlide, thirdSlide, firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'saveHistoryState',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds',
    'insertBefore',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
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

test('reorderSlides no-ops when the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const calls = [];
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(reorderSlidesSource, context);

  assert.equal(context.reorderSlides(0, 1), false);

  assert.deepEqual(calls, [['getIframeDoc']]);
});

test('reorderSlides no-ops when the slide container is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      calls.push(['getElementById', id]);
      return null;
    }
  };
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(reorderSlidesSource, context);

  assert.equal(context.reorderSlides(0, 1), false);

  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getElementById', 'slidesContainer']
  ]);
});

test('reorderSlides no-ops when the requested slide indexes are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const slides = [{ id: 'slide-1' }, { id: 'slide-2' }];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(reorderSlidesSource, context);

  const result = context.reorderSlides(0, 9);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('reorderSlides no-ops when the requested slide indexes are unchanged', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const firstSlide = { id: 'slide-1', nextSibling: null };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  const slides = [firstSlide, secondSlide];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(reorderSlidesSource, context);

  const result = context.reorderSlides(1, 1);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('deleteSlideNodeById returns delegated deletion results', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeByIdSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNodeById(slideId, doc = getIframeDoc()) {',
    '\n\n    function reorderSlidesById(sourceSlideId, targetSlideId, doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    deleteSlideNode(index) {
      calls.push(['deleteSlideNode', index]);
      return index === 2;
    },
    getSlideIndexById(slideId, doc) {
      calls.push(['getSlideIndexById', slideId, doc]);
      if (slideId === 'slide-3') return 2;
      if (slideId === 'slide-4') return 3;
      return -1;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(deleteSlideNodeByIdSource, context);

  assert.equal(context.deleteSlideNodeById('missing'), false);
  assert.equal(context.deleteSlideNodeById('slide-3'), true);
  assert.equal(context.deleteSlideNodeById('slide-4'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlideIndexById', 'missing', iframeDoc],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-3', iframeDoc],
    ['deleteSlideNode', 2],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-4', iframeDoc],
    ['deleteSlideNode', 3]
  ]);
});

test('reorderSlidesById returns delegated reorder results', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesByIdSource = extractFunctionSource(
    fileContent,
    'function reorderSlidesById(sourceSlideId, targetSlideId, doc = getIframeDoc()) {',
    '\n\n    function isEligibleEditableElement(el) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    getSlideIndexById(slideId, doc) {
      calls.push(['getSlideIndexById', slideId, doc]);
      if (slideId === 'slide-1') return 0;
      if (slideId === 'slide-2') return 1;
      return -1;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    reorderSlides(fromIdx, toIdx) {
      calls.push(['reorderSlides', fromIdx, toIdx]);
      return fromIdx !== toIdx;
    }
  };

  vm.createContext(context);
  vm.runInContext(reorderSlidesByIdSource, context);

  assert.equal(context.reorderSlidesById('missing', 'slide-2'), false);
  assert.equal(context.reorderSlidesById('slide-1', 'slide-2'), true);
  assert.equal(context.reorderSlidesById('slide-1', 'slide-1'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlideIndexById', 'missing', iframeDoc],
    ['getSlideIndexById', 'slide-2', iframeDoc],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['getSlideIndexById', 'slide-2', iframeDoc],
    ['reorderSlides', 0, 1],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['reorderSlides', 0, 0]
  ]);
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
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(1);

  assert.equal(result, true);
  assert.deepEqual(slides, [firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'saveHistoryState',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds',
    'getEditorSlideId',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[4][1], iframeDoc);
  assert.equal(calls[5][1], secondSlide);
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

test('deleteSlideNode no-ops when the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    function getIframeDoc() {'
  );

  const calls = [];
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(deleteSlideNodeSource, context);

  assert.equal(context.deleteSlideNode(0), false);

  assert.deepEqual(calls, [['getIframeDoc']]);
});

test('deleteSlideNode no-ops when the requested slide index is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    function getIframeDoc() {'
  );

  const firstSlide = { id: 'slide-1', remove() {} };
  const secondSlide = { id: 'slide-2', remove() {} };
  const slides = [firstSlide, secondSlide];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(9);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('deleteSlideNode refuses to remove the final remaining slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    function getIframeDoc() {'
  );

  const alerts = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const calls = [];
  const context = {
    alert(message) {
      alerts.push(message);
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [{ id: 'slide-1', remove() {} }];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(0);

  assert.equal(result, false);
  assert.deepEqual(alerts, ['Action aborted: presentation requires at least one slide.']);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});
