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

test('insertElement uses the shared iframe accessor before adding a heading element to the active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );

  const calls = [];
  let appendedElement = null;
  const activeSlide = {
    children: [{}, {}],
    appendChild(node) {
      appendedElement = node;
      calls.push(['appendChild', node]);
      return node;
    }
  };
  const iframeDoc = {
    createElement(tag) {
      calls.push(['createElement', tag]);
      return {
        tagName: tag.toUpperCase(),
        style: {},
        appendChild() {}
      };
    }
  };
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    makeElementsHoverable(node) {
      calls.push(['makeElementsHoverable', node]);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectElement(node) {
      calls.push(['selectElement', node]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  vm.runInContext(insertElementSource, context);

  context.insertElement('h2');

  assert.equal(appendedElement?.tagName, 'H2');
  assert.equal(appendedElement.textContent, 'New Heading');
  assert.equal(appendedElement.style.left, 'calc(30% + 30px)');
  assert.equal(appendedElement.style.top, 'calc(40% + 30px)');
  assert.equal(appendedElement.style.position, 'absolute');
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getActiveSlide',
    'createElement',
    'makeElementsHoverable',
    'appendChild',
    'selectElement',
    'generateThumbnails',
    'saveHistoryState',
    'triggerAutoSave',
    'updateLayersList',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[2][1], 'h2');
  assert.equal(calls[3][1], appendedElement);
  assert.equal(calls[5][1], appendedElement);
  assert.equal(calls[10][1], 'Auto: Added H2');
});
