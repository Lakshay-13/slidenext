const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const insertion = require('../shared/studio-editor-insertion.js');

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
    SlideNextStudioEditorInsertion: insertion,
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
      context.updateLayersList();
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

  const result = context.insertElement('h2');

  assert.equal(result, true);
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
    'updateLayersList',
    'generateThumbnails',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[2][1], 'h2');
  assert.equal(calls[3][1], appendedElement);
  assert.equal(calls[5][1], appendedElement);
  assert.equal(calls[10][1], 'Auto: Added H2');
});

test('insertElement records a slide-scoped markup transaction when adding a heading', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );

  const calls = [];
  const activeSlide = {
    children: [],
    innerHTML: '<p>Before</p>',
    appendChild(node) {
      this.innerHTML = '<p>Before</p><h2>New Heading</h2>';
      calls.push(['appendChild', node]);
      return node;
    }
  };
  const iframeDoc = {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        style: {},
        appendChild() {}
      };
    }
  };
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorInsertion: insertion,
    generateThumbnails() {},
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId(slide) {
      assert.equal(slide, activeSlide);
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    makeElementsHoverable() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    selectElement() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), true);
  const saveCall = calls.find(([name]) => name === 'saveHistoryState');
  assert.deepEqual(JSON.parse(JSON.stringify(saveCall)), [
    'saveHistoryState',
    false,
    {
      kind: 'slidenext.editor.transaction',
      version: 1,
      operations: [{
        type: 'markup',
        elementId: 'slide:slide-1',
        before: '<p>Before</p>',
        after: '<p>Before</p><h2>New Heading</h2>'
      }]
    }
  ]);
});

test('insertElement no-ops when no active slide is available or the element type is unsupported', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );

  const calls = [];
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
  let activeSlide = null;
  const context = {
    SlideNextStudioEditorInsertion: insertion,
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    updateInsertionActionState(doc) {
      calls.push(['updateInsertionActionState', doc]);
    }
  };

  vm.createContext(context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['updateInsertionActionState', iframeDoc]
  ]);

  activeSlide = {
    children: [],
    appendChild() {
      calls.push(['appendChild']);
    }
  };
  calls.length = 0;

  assert.equal(context.insertElement('unknown'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['updateInsertionActionState', iframeDoc]
  ]);
});
