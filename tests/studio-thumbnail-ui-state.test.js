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
    addEventListener(type, handler) {
      this.listeners.push({ type, handler });
    }
  };
}

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
  assert.match(thumbnailsList.children[0].innerHTML, /deleteSlideNodeById\('slide-1'\)/);
  assert.match(thumbnailsList.children[1].innerHTML, /deleteSlideNodeById\('slide-2'\)/);
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
