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
    style: {},
    addEventListener() {}
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

  const context = {
    buildEditorDeckSnapshot() {
      return deckSnapshotRef.current;
    },
    document: {
      getElementById(id) {
        if (id === 'studioFrame') {
          return {
            contentDocument: iframeDoc,
            contentWindow: { document: iframeDoc }
          };
        }
        if (id === 'thumbnailsList') return thumbnailsList;
        if (id === 'slideCountLabel') return slideCountLabel;
        return null;
      },
      createElement() {
        return createThumbCard();
      }
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
});
