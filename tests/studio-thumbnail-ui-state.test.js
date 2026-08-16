const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const thumbnailView = require('../shared/studio-editor-thumbnail-view.js');
const thumbnailController = require('../shared/studio-editor-thumbnail-controller.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createListContainer() {
  return {
    children: [],
    _innerHTML: '',
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(value) {
      this._innerHTML = value;
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    }
  };
}

function createThumbCard() {
  return {
    className: '',
    draggable: false,
    dataset: {},
    innerHTML: '',
    listeners: [],
    style: {},
    textContent: '',
    children: [],
    addEventListener(type, handler) {
      this.listeners.push({ type, handler });
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    }
  };
}

test('updateActiveThumbnailCardState fails closed when the editor shell is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveThumbnailCardState(activeSlideId) {',
    '\n\n    function syncStudioChromeToActiveSlide'
  );
  const context = { document: {} };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveThumbnailCardState('slide-1'), false);
});

test('updateActiveThumbnailCardState delegates to the thumbnail controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveThumbnailCardState(activeSlideId) {',
    '\n\n    function syncStudioChromeToActiveSlide'
  );
  const calls = [];
  const context = {
    studioEditorThumbnailController: {
      syncActiveSlideCard(activeSlideId) {
        calls.push(activeSlideId);
        return 'sync-result';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveThumbnailCardState('slide-2'), 'sync-result');
  assert.deepEqual(calls, ['slide-2']);
});

test('setStudioThumbnailSlideCount updates the shared slide counter control', () => {
  const slideCountLabel = { textContent: '' };
  const documentRef = {
    getElementById(id) {
      assert.equal(id, 'slideCountLabel');
      return slideCountLabel;
    }
  };

  assert.equal(thumbnailView.setStudioThumbnailSlideCount({
    documentRef,
    label: '3 / 8'
  }), true);
  assert.equal(slideCountLabel.textContent, '3 / 8');
});

test('syncStudioThumbnailList derives the slide-delete affordance from snapshot size', () => {
  const thumbnailsList = createListContainer();
  const documentRef = {
    getElementById(id) {
      return id === 'thumbnailsList' ? thumbnailsList : null;
    },
    createElement() {
      return createThumbCard();
    }
  };
  const deckSnapshot = {
    activeSlideId: 'slide-1',
    slides: [
      { id: 'slide-1', index: 0, title: 'First', backgroundLabel: 'Solid' },
      { id: 'slide-2', index: 1, title: 'Second', backgroundLabel: 'Solid' }
    ]
  };

  assert.equal(thumbnailView.syncStudioThumbnailList({
    documentRef,
    deckSnapshot,
    canMutateSlides: true
  }), true);
  assert.equal(thumbnailsList.children.length, 2);
  assert.equal(thumbnailsList.children[0].children.length, 1);
  assert.equal(thumbnailsList.children[0].children[0].title, 'Delete Slide');
  assert.equal(thumbnailsList.children[0].style.contentVisibility, 'auto');
  assert.equal(thumbnailsList.children[0].style.containIntrinsicSize, '72px');
});

test('renderStudioThumbnailList escapes legacy slide metadata and binds delete actions without inline handlers', () => {
  const thumbnailsList = createListContainer();
  let deletedSlideId = '';
  const documentRef = {
    getElementById(id) {
      return id === 'thumbnailsList' ? thumbnailsList : null;
    },
    createElement() {
      return createThumbCard();
    }
  };

  assert.equal(thumbnailView.renderStudioThumbnailList({
    documentRef,
    deckSnapshot: {
      activeSlideId: 'slide-1',
      slides: [{
        id: "slide-1'); alert('unexpected') //",
        index: 0,
        title: '<img src=x onerror=alert(1)>',
        backgroundLabel: '" onmouseover="alert(2)'
      }, {
        id: 'slide-2',
        index: 1,
        title: 'Second',
        backgroundLabel: 'Solid'
      }]
    },
    canMutateSlides: true,
    canDeleteSlides: true,
    onDeleteSlide(slideId) {
      deletedSlideId = slideId;
    }
  }), true);

  const cardMarkup = thumbnailsList.children[0].innerHTML;
  assert.doesNotMatch(cardMarkup, /<img src=x/);
  assert.match(cardMarkup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(cardMarkup, /&quot; onmouseover=&quot;alert\(2\)/);
  assert.doesNotMatch(cardMarkup, /onclick|deleteSlideNodeById/);
  const deleteButton = thumbnailsList.children[0].children[0];
  assert.equal(deleteButton.title, 'Delete Slide');
  deleteButton.listeners[0].handler({ stopPropagation() {} });
  assert.equal(deletedSlideId, "slide-1'); alert('unexpected') //");
});

test('renderStudioThumbnailList groups slides by section and labels unsectioned slides', () => {
  const thumbnailsList = createListContainer();
  const documentRef = {
    getElementById(id) {
      return id === 'thumbnailsList' ? thumbnailsList : null;
    },
    createElement() {
      return createThumbCard();
    }
  };

  assert.equal(thumbnailView.renderStudioThumbnailList({
    documentRef,
    deckSnapshot: {
      activeSlideId: 'slide-1',
      slides: [
        { id: 'slide-1', index: 0, title: 'First', section: 'Opening', backgroundLabel: 'Solid' },
        { id: 'slide-2', index: 1, title: 'Second', section: 'Opening', backgroundLabel: 'Solid' },
        { id: 'slide-3', index: 2, title: 'Third', section: 'Closing', backgroundLabel: 'Solid' },
        { id: 'slide-4', index: 3, title: 'Fourth', section: '', backgroundLabel: 'Solid' }
      ]
    },
    canMutateSlides: false
  }), true);

  assert.deepEqual(
    thumbnailsList.children.filter((child) => child.textContent).map((child) => child.textContent),
    ['Opening', 'Closing', 'Unsectioned']
  );
  assert.equal(thumbnailsList.children.length, 7);
});

test('renderStudioThumbnailList batches live sidebar insertion through a document fragment', () => {
  const thumbnailsList = createListContainer();
  const fragment = createListContainer();
  let listAppendCalls = 0;
  const appendChild = thumbnailsList.appendChild;
  thumbnailsList.appendChild = (child) => {
    listAppendCalls += 1;
    return appendChild.call(thumbnailsList, child);
  };
  const documentRef = {
    getElementById(id) {
      return id === 'thumbnailsList' ? thumbnailsList : null;
    },
    createElement() {
      return createThumbCard();
    },
    createDocumentFragment() {
      return fragment;
    }
  };

  assert.equal(thumbnailView.renderStudioThumbnailList({
    documentRef,
    deckSnapshot: {
      activeSlideId: 'slide-1',
      slides: [
        { id: 'slide-1', index: 0, title: 'First', section: 'Opening', backgroundLabel: 'Solid' },
        { id: 'slide-2', index: 1, title: 'Second', section: 'Opening', backgroundLabel: 'Solid' }
      ]
    },
    canMutateSlides: false
  }), true);
  assert.equal(listAppendCalls, 1);
  assert.equal(fragment.children.length, 3);
  assert.equal(thumbnailsList.children[0], fragment);
});

test('syncStudioEditorThumbnails assembles the live editor snapshot before rendering', () => {
  const thumbnailsList = createListContainer();
  const slideCountLabel = { textContent: '' };
  const documentRef = {
    getElementById(id) {
      if (id === 'thumbnailsList') return thumbnailsList;
      if (id === 'slideCountLabel') return slideCountLabel;
      return null;
    },
    createElement() {
      return createThumbCard();
    }
  };
  const iframeDoc = { id: 'iframe-doc' };
  const deckSnapshot = {
    activeSlideId: 'slide-2',
    slides: [
      { id: 'slide-1', index: 0, title: 'First', backgroundLabel: 'Solid' },
      { id: 'slide-2', index: 1, title: 'Second', backgroundLabel: 'Gradient' }
    ]
  };
  const activeIndexCalls = [];

  assert.equal(thumbnailView.syncStudioEditorThumbnails({
    documentRef,
    getDocument() {
      return iframeDoc;
    },
    buildDeckSnapshot(doc) {
      assert.equal(doc, iframeDoc);
      return deckSnapshot;
    },
    getActiveSlideIndex(doc, snapshot) {
      activeIndexCalls.push([doc, snapshot]);
      return 1;
    },
    onSelectSlide() {},
    setupDragAndDropThumbnail() {}
  }), true);

  assert.deepEqual(activeIndexCalls, [[iframeDoc, deckSnapshot]]);
  assert.equal(slideCountLabel.textContent, '2 / 2');
  assert.equal(thumbnailsList.children.length, 2);
  assert.equal(thumbnailsList.children[1].draggable, true);
  assert.equal(thumbnailsList.children[1].children.length, 1);
});

test('attachStudioThumbnailDragAndDrop preserves thumbnail drag state and reorder behavior', () => {
  const card = createThumbCard();
  card.dataset.slideId = 'slide-2';
  const classes = new Set();
  card.classList = {
    add(...values) {
      values.forEach((value) => classes.add(value));
    },
    remove(...values) {
      values.forEach((value) => classes.delete(value));
    },
    contains(value) {
      return classes.has(value);
    }
  };
  let draggedSlideId = '';
  const calls = [];
  assert.equal(thumbnailView.attachStudioThumbnailDragAndDrop(card, {
    getDraggedSlideId: () => draggedSlideId,
    setDraggedSlideId(nextSlideId) {
      draggedSlideId = nextSlideId;
    },
    onReorder(sourceSlideId, targetSlideId) {
      calls.push(['reorder', sourceSlideId, targetSlideId]);
    }
  }), true);

  const getHandler = (type) => card.listeners.find((listener) => listener.type === type).handler;
  getHandler('dragstart')({});
  assert.equal(draggedSlideId, 'slide-2');
  assert.equal(card.style.opacity, '0.4');

  let prevented = false;
  getHandler('dragover')({
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(card.classList.contains('border-dashed'), true);
  assert.equal(card.classList.contains('border-[#7028d0]/50'), true);

  card.dataset.slideId = 'slide-3';
  getHandler('drop')({
    preventDefault() {}
  });
  assert.deepEqual(calls, [['reorder', 'slide-2', 'slide-3']]);
  assert.equal(card.classList.contains('border-dashed'), false);

  getHandler('dragend')({});
  assert.equal(draggedSlideId, '');
  assert.equal(card.style.opacity, '1');
});

test('attachStudioThumbnailDragAndDrop replaces callbacks without duplicate listeners', () => {
  const card = createThumbCard();
  card.dataset.slideId = 'slide-2';
  card.classList = {
    add() {},
    remove() {}
  };
  let draggedSlideId = '';
  const calls = [];
  const options = {
    getDraggedSlideId: () => draggedSlideId,
    setDraggedSlideId(nextSlideId) {
      draggedSlideId = nextSlideId;
    },
    onReorder() {
      calls.push('old');
    }
  };

  assert.equal(thumbnailView.attachStudioThumbnailDragAndDrop(card, options), true);
  assert.equal(thumbnailView.attachStudioThumbnailDragAndDrop(card, {
    ...options,
    onReorder(sourceSlideId, targetSlideId) {
      calls.push([sourceSlideId, targetSlideId]);
    }
  }), true);
  assert.equal(card.listeners.length, 5);

  const getHandler = (type) => card.listeners.find((listener) => listener.type === type).handler;
  getHandler('dragstart')({});
  card.dataset.slideId = 'slide-3';
  getHandler('drop')({ preventDefault() {} });

  assert.deepEqual(calls, [['slide-2', 'slide-3']]);
});

test('setupDragAndDropThumbnail delegates event binding to the shared thumbnail view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setupSource = extractFunctionSource(
    fileContent,
    'function setupDragAndDropThumbnail(card) {',
    '\n\n    // Swap node indices in iframe and re-render'
  );
  const card = { dataset: { slideId: 'slide-2' } };
  const calls = [];
  const context = {
    studioEditorThumbnailController: {
      attach(nextCard) {
        calls.push(['attach', nextCard]);
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(`let draggedThumbSlideId = '';\n${setupSource}`, context);

  assert.equal(context.setupDragAndDropThumbnail(card), true);
  assert.equal(calls[0][0], 'attach');
  assert.equal(calls[0][1], card);
});

test('generateThumbnails delegates thumbnail option assembly to the shared coordinator', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const generateThumbnailsSource = extractFunctionSource(
    fileContent,
    'function generateThumbnails() {',
    '\n\n    // HTML5 Drag and Drop handlers for thumbnail cards'
  );
  const context = {
    studioEditorThumbnailController: {
      render() {
        return 'delegated';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(generateThumbnailsSource, context);

  assert.equal(context.generateThumbnails(), 'delegated');
});

test('generateThumbnails hides the slide delete affordance when only one slide remains', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const generateThumbnailsSource = extractFunctionSource(
    fileContent,
    'function generateThumbnails() {',
    '\n\n    // HTML5 Drag and Drop handlers for thumbnail cards'
  );

  const slideCountLabel = { textContent: '' };
  const thumbnailsList = createListContainer();
  const iframeDoc = { id: 'doc' };
  const deckSnapshotRef = {
    current: {
      activeSlideId: 'slide-1',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Only Slide',
          backgroundLabel: 'Solid'
        }
      ]
    }
  };
  let getIframeDocCalls = 0;

  const context = {
    SlideNextStudioEditorThumbnailView: thumbnailView,
    buildEditorDeckSnapshot() {
      return deckSnapshotRef.current;
    },
    document: {
      getElementById(id) {
        if (id === 'thumbnailsList') return thumbnailsList;
        if (id === 'slideCountLabel') return slideCountLabel;
        return null;
      },
      createElement() {
        return createThumbCard();
      }
    },
    getIframeDoc() {
      getIframeDocCalls += 1;
      return iframeDoc;
    },
    getStudioActiveSlideIndex() {
      return 0;
    },
    setActiveSlideById() {},
    setupDragAndDropThumbnail() {}
  };
  context.studioEditorThumbnailController = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView,
    documentRef: context.document,
    getDocument: context.getIframeDoc,
    buildDeckSnapshot: context.buildEditorDeckSnapshot,
    getActiveSlideIndex: context.getStudioActiveSlideIndex,
    onSelectSlide: context.setActiveSlideById
  });

  vm.createContext(context);
  vm.runInContext(generateThumbnailsSource, context);

  context.generateThumbnails();
  assert.equal(slideCountLabel.textContent, '1 / 1');
  assert.equal(thumbnailsList.children.length, 1);
  assert.doesNotMatch(thumbnailsList.children[0].innerHTML, /deleteSlideNodeById/);

  deckSnapshotRef.current = {
    activeSlideId: 'slide-1',
    slides: [
      {
        id: 'slide-1',
        index: 0,
        title: 'First Slide',
        backgroundLabel: 'Solid'
      },
      {
        id: 'slide-2',
        index: 1,
        title: 'Second Slide',
        backgroundLabel: 'Gradient'
      }
    ]
  };

  context.generateThumbnails();
  assert.equal(slideCountLabel.textContent, '1 / 2');
  assert.equal(thumbnailsList.children.length, 2);
  assert.equal(thumbnailsList.children[0].children.length, 1);
  assert.equal(thumbnailsList.children[1].children.length, 1);
  assert.equal(getIframeDocCalls, 2);
});

test('generateThumbnails renders a read-only canonical fallback when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const generateThumbnailsSource = extractFunctionSource(
    fileContent,
    'function generateThumbnails() {',
    '\n\n    // HTML5 Drag and Drop handlers for thumbnail cards'
  );

  const slideCountLabel = { textContent: '' };
  const thumbnailsList = createListContainer();
  let getIframeDocCalls = 0;
  let setActiveSlideByIdCalls = 0;
  let setupDragAndDropCalls = 0;

  const context = {
    SlideNextStudioEditorThumbnailView: thumbnailView,
    buildEditorDeckSnapshot() {
      return {
        activeSlideId: 'slide-2',
        slides: [
          {
            id: 'slide-1',
            index: 0,
            title: 'First Slide',
            backgroundLabel: 'Solid'
          },
          {
            id: 'slide-2',
            index: 1,
            title: 'Second Slide',
            backgroundLabel: 'Gradient'
          }
        ]
      };
    },
    document: {
      getElementById(id) {
        if (id === 'thumbnailsList') return thumbnailsList;
        if (id === 'slideCountLabel') return slideCountLabel;
        return null;
      },
      createElement() {
        return createThumbCard();
      }
    },
    getIframeDoc() {
      getIframeDocCalls += 1;
      return null;
    },
    getStudioActiveSlideIndex() {
      return 1;
    },
    setActiveSlideById() {
      setActiveSlideByIdCalls += 1;
    },
    setupDragAndDropThumbnail() {
      setupDragAndDropCalls += 1;
    }
  };
  context.studioEditorThumbnailController = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView,
    documentRef: context.document,
    getDocument: context.getIframeDoc,
    buildDeckSnapshot: context.buildEditorDeckSnapshot,
    getActiveSlideIndex: context.getStudioActiveSlideIndex,
    onSelectSlide: context.setActiveSlideById
  });

  vm.createContext(context);
  vm.runInContext(generateThumbnailsSource, context);

  context.generateThumbnails();

  assert.equal(slideCountLabel.textContent, '2 / 2');
  assert.equal(thumbnailsList.children.length, 2);
  assert.equal(thumbnailsList.children[0].draggable, false);
  assert.equal(thumbnailsList.children[1].draggable, false);
  assert.deepEqual(thumbnailsList.children[0].listeners, []);
  assert.deepEqual(thumbnailsList.children[1].listeners, []);
  assert.doesNotMatch(thumbnailsList.children[0].innerHTML, /deleteSlideNodeById/);
  assert.doesNotMatch(thumbnailsList.children[1].innerHTML, /deleteSlideNodeById/);
  assert.equal(setActiveSlideByIdCalls, 0);
  assert.equal(setupDragAndDropCalls, 0);
  assert.equal(getIframeDocCalls, 1);
});

test('generateThumbnails tolerates missing organizer chrome nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const generateThumbnailsSource = extractFunctionSource(
    fileContent,
    'function generateThumbnails() {',
    '\n\n    // HTML5 Drag and Drop handlers for thumbnail cards'
  );

  const calls = [];
  const context = {
    SlideNextStudioEditorThumbnailView: thumbnailView,
    buildEditorDeckSnapshot() {
      return {
        activeSlideId: 'slide-1',
        slides: [
          {
            id: 'slide-1',
            index: 0,
            title: 'Only Slide',
            backgroundLabel: 'Solid'
          }
        ]
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'thumbnailsList' || id === 'slideCountLabel') {
          return null;
        }
        return null;
      },
      createElement() {
        calls.push(['createElement']);
        return createThumbCard();
      }
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { id: 'doc' };
    },
    getStudioActiveSlideIndex() {
      calls.push(['getStudioActiveSlideIndex']);
      return 0;
    },
    setActiveSlideById() {
      calls.push(['setActiveSlideById']);
    },
    setupDragAndDropThumbnail() {
      calls.push(['setupDragAndDropThumbnail']);
    }
  };
  context.studioEditorThumbnailController = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView,
    documentRef: context.document,
    getDocument: context.getIframeDoc,
    buildDeckSnapshot: context.buildEditorDeckSnapshot,
    getActiveSlideIndex: context.getStudioActiveSlideIndex,
    onSelectSlide: context.setActiveSlideById
  });

  vm.createContext(context);
  vm.runInContext(generateThumbnailsSource, context);

  assert.doesNotThrow(() => context.generateThumbnails());
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getElementById', 'thumbnailsList'],
    ['getStudioActiveSlideIndex'],
    ['getElementById', 'slideCountLabel']
  ]);
});
