const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const insertion = require('../shared/studio-editor-insertion.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadElementInsertionHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorElementInsertionWithTransaction(type, options = {}) {',
    '\n\n    function insertElement(type) {'
  );
  vm.runInContext(helperSource, context);
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
  loadElementInsertionHelper(fileContent, context);
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
  loadElementInsertionHelper(fileContent, context);
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

test('insertElement delegates successful insertion finalization to the shared lifecycle helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  const activeSlide = {
    children: [],
    appendChild() {}
  };
  const iframeDoc = {
    createElement() {
      return {
        tagName: 'H2',
        style: {},
        appendChild() {}
      };
    }
  };
  let finalized = null;
  const context = {
    SlideNextStudioEditorInsertion: insertion,
    getActiveSlide() {
      return activeSlide;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    makeElementsHoverable() {},
    finalizeInsertedElements(elements, versionLabel, transaction) {
      finalized = { elements, versionLabel, transaction };
      return true;
    }
  };

  vm.createContext(context);
  loadElementInsertionHelper(fileContent, context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), true);
  assert.equal(finalized.elements.length, 1);
  assert.equal(finalized.elements[0].tagName, 'H2');
  assert.equal(finalized.versionLabel, 'Auto: Added H2');
  assert.equal(finalized.transaction, null);
});

test('insertElement forwards an immutable canonical node sidecar for new elements', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  const canonicalBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{ id: 'slide-1' }]
  });
  const activeSlide = {
    children: [],
    appendChild() {}
  };
  const insertedElement = {
    tagName: 'H2',
    dataset: { editorId: 'node-2' },
    style: {},
    appendChild() {}
  };
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        assert.equal(element, insertedElement);
        assert.equal(options.getNodeId(element), 'node-2');
        return { id: 'node-2', tagName: 'h2', text: 'New Heading' };
      }
    },
    SlideNextStudioEditorInsertion: {
      applyStudioElementInsertion(type, options) {
        assert.equal(type, 'h2');
        options.slide.appendChild(insertedElement);
        return { element: insertedElement, transaction: { id: 'tx-insert' } };
      }
    },
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId(slide) {
      assert.equal(slide, activeSlide);
      return 'slide-1';
    },
    getIframeDoc() {
      return {};
    },
    buildEditorCanonicalDeck(doc) {
      assert.deepEqual(doc, {});
      return canonicalBefore;
    },
    makeElementsHoverable() {},
    finalizeInsertedElements(elements, versionLabel, transaction, canonicalDeck) {
      finalized = { elements, versionLabel, transaction, canonicalDeck };
      return true;
    }
  };

  vm.createContext(context);
  loadElementInsertionHelper(fileContent, context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), true);
  assert.equal(finalized.elements[0], insertedElement);
  assert.equal(finalized.versionLabel, 'Auto: Added H2');
  assert.deepEqual(finalized.transaction, { id: 'tx-insert' });
  assert.deepEqual(finalized.canonicalDeck.slides[0].nodes.map((node) => node.id), ['node-2']);
  assert.equal(finalized.canonicalDeck.slides[0].nodes[0].text, 'New Heading');
  assert.deepEqual(canonicalBefore.slides[0].nodes, []);
});

test('insertElement preserves the canonical sidecar in its legacy persistence fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  const canonicalBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{ id: 'slide-1' }]
  });
  const activeSlide = {
    children: [],
    appendChild() {}
  };
  const insertedElement = {
    tagName: 'H2',
    dataset: { editorId: 'node-2' },
    style: {},
    appendChild() {}
  };
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextDeckImport: {
      importElementToCanonicalNode() {
        return { id: 'node-2', tagName: 'h2', text: 'New Heading' };
      }
    },
    SlideNextStudioEditorInsertion: {
      applyStudioElementInsertion(type, options) {
        options.slide.appendChild(insertedElement);
        return { element: insertedElement, transaction: { id: 'tx-insert-legacy' } };
      }
    },
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return {};
    },
    buildEditorCanonicalDeck() {
      return canonicalBefore;
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    makeElementsHoverable() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    selectElement() {
      calls.push(['selectElement']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion() {
      calls.push(['triggerAutoVersion']);
    }
  };

  vm.createContext(context);
  loadElementInsertionHelper(fileContent, context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), true);
  const saveCall = calls.find(([name]) => name === 'saveHistoryState');
  assert.equal(saveCall[1], false);
  assert.deepEqual(saveCall[2], { id: 'tx-insert-legacy' });
  assert.deepEqual(saveCall[3].slides[0].nodes.map(({ id, tagName, text }) => ({
    id,
    tagName,
    text
  })), [{
    id: 'node-2',
    tagName: 'h2',
    text: 'New Heading'
  }]);
  assert.deepEqual(canonicalBefore.slides[0].nodes, []);
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
  loadElementInsertionHelper(fileContent, context);
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

test('insertElement preserves the fallback insertion path when the shared apply helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertElementSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  const calls = [];
  const activeSlide = {
    children: [],
    appendChild(element) {
      calls.push(['appendChild', element]);
      return element;
    }
  };
  const insertedElement = { tagName: 'H2' };
  const context = {
    SlideNextStudioEditorInsertion: {
      createStudioInsertedElement(type, options) {
        calls.push(['createStudioInsertedElement', type, options]);
        return insertedElement;
      }
    },
    getActiveSlide() {
      return activeSlide;
    },
    getIframeDoc() {
      return {};
    },
    makeElementsHoverable(element) {
      calls.push(['makeElementsHoverable', element]);
    },
    finalizeInsertedElements(elements, versionLabel, transaction) {
      calls.push(['finalizeInsertedElements', elements, versionLabel, transaction]);
      return true;
    }
  };

  vm.createContext(context);
  loadElementInsertionHelper(fileContent, context);
  vm.runInContext(insertElementSource, context);

  assert.equal(context.insertElement('h2'), true);
  assert.deepEqual(calls.map(([name]) => name), [
    'createStudioInsertedElement',
    'makeElementsHoverable',
    'appendChild',
    'finalizeInsertedElements'
  ]);
  assert.equal(calls[0][1], 'h2');
  assert.equal(calls[0][2].offset, 0);
  assert.equal(calls[1][1], insertedElement);
  assert.equal(calls[2][1], insertedElement);
  assert.equal(calls[3][1][0], insertedElement);
  assert.equal(calls[3][2], 'Auto: Added H2');
  assert.equal(calls[3][3], null);
});
