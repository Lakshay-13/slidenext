const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assetView = require('../shared/studio-editor-asset-view.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('shared asset view wires use and remove actions to injected callbacks', () => {
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const events = [];
  const documentRef = {
    getElementById() {
      return list;
    },
    createElement() {
      return {
        children: [],
        addEventListener(type, handler) {
          events.push({ type, handler });
        },
        appendChild(child) {
          this.children.push(child);
        },
        setAttribute() {}
      };
    }
  };
  const calls = [];

  assert.equal(assetView.renderStudioAssetLibrary({
    documentRef,
    assets: [{ id: 'hero', name: 'Hero', type: 'image' }],
    canApply: true,
    applyAsset(assetId) {
      calls.push(['apply', assetId]);
    },
    removeAsset(assetId) {
      calls.push(['remove', assetId]);
    },
    insertAsset(assetId) {
      calls.push(['insert', assetId]);
    }
  }), true);

  events[0].handler();
  events[1].handler();
  events[2].handler();
  assert.deepEqual(calls, [['apply', 'hero'], ['insert', 'hero'], ['remove', 'hero']]);
});

test('shared asset view renders previews only for image sources', () => {
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const documentRef = {
    getElementById() {
      return list;
    },
    createElement(tagName) {
      return {
        tagName,
        children: [],
        addEventListener() {},
        appendChild(child) {
          this.children.push(child);
        },
        setAttribute() {}
      };
    }
  };

  assert.equal(assetView.renderStudioAssetLibrary({
    documentRef,
    assets: [
      { id: 'hero', name: 'Hero', type: 'image', src: '/images/hero.png' },
      { id: 'font', name: 'Font', type: 'font', src: '/fonts/hero.woff2' },
      { id: 'relative', name: 'Relative', type: 'image', src: 'assets/relative.png' }
    ]
  }), true);

  assert.equal(list.children[0].children[0].children[0].tagName, 'img');
  assert.equal(list.children[0].children[0].children[0].src, '/images/hero.png');
  assert.equal(list.children[1].children[0].children[0].tagName, 'span');
  assert.equal(list.children[2].children[0].children[0].tagName, 'span');
});

test('shared asset state sync derives image eligibility before rendering the library', () => {
  const list = {
    children: [],
    set textContent(value) {
      this.children = [];
      this.value = value;
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const documentRef = {
    getElementById() {
      return list;
    },
    createElement() {
      return {
        textContent: '',
        children: [],
        disabled: false,
        addEventListener() {},
        appendChild(child) {
          this.children.push(child);
        },
        setAttribute() {}
      };
    }
  };
  const assets = [{ id: 'hero', name: 'Hero', type: 'image' }];

  assert.equal(assetView.syncStudioAssetState({
    documentRef,
    assets,
    selectedElement: { tagName: 'IMG' },
    isElementLocked: () => false
  }), true);
  assert.equal(list.children[0].children[1].disabled, false);

  assert.equal(assetView.syncStudioAssetState({
    documentRef,
    assets,
    selectedElement: { tagName: 'div' },
    isElementLocked: () => false
  }), true);
  assert.equal(list.children[0].children[1].disabled, true);
});

test('addAssetToLibrary validates the source and delegates a normalized image asset', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function addAssetToLibrary() {',
    '\n\n    function nudgeSelectedElements'
  );
  const nameInput = { value: '  Hero  ' };
  const sourceInput = { value: '  /images/hero.png  ' };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        return id === 'assetNameInput' ? nameInput : sourceInput;
      }
    },
    studioEditorAssetController: {
      addAsset(asset) {
        calls.push(asset);
        return { assets: [asset] };
      },
      removeAsset() {
        return true;
      }
    },
    updateAssetLibraryState() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.addAssetToLibrary(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'Hero');
  assert.equal(calls[0].src, '/images/hero.png');
  assert.equal(calls[0].type, 'image');
  assert.equal(sourceInput.value, '');
});

test('applyAssetToSelectedImage delegates asset binding and refreshes the library state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function addAssetToLibrary() {',
    '\n\n    function nudgeSelectedElements'
  );
  let delegatedId = '';
  let refreshes = 0;
  const context = {
    document: {
      getElementById() {
        return { value: '' };
      }
    },
    studioEditorAssetController: {
      addAsset() {
        return null;
      },
      removeAsset() {
        return false;
      },
      applyAsset(assetId) {
        delegatedId = assetId;
        return true;
      }
    },
    updateAssetLibraryState() {
      refreshes += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.applyAssetToSelectedImage('hero'), true);
  assert.equal(delegatedId, 'hero');
  assert.equal(refreshes, 1);
});

test('insertAssetToActiveSlide stamps the canonical asset before insertion', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function addAssetToLibrary() {',
    '\n\n    function nudgeSelectedElements'
  );
  const attributes = {};
  const element = {
    src: '',
    setAttribute(name, value) {
      attributes[name] = value;
    }
  };
  const calls = [];
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    document: { getElementById() { return { value: '' }; } },
    getIframeDoc() {
      return { id: 'doc' };
    },
    buildEditorCanonicalDeck() {
      return { assets: [{ id: 'hero', name: 'Hero', src: '/images/hero.png' }] };
    },
    studioEditorElementInsertionController: {
      insert(type, options) {
        calls.push([type, options.versionLabel]);
        options.prepareElement(element);
        return true;
      }
    },
    studioEditorAssetController: {
      addAsset() { return null; },
      removeAsset() { return false; },
      applyAsset() { return false; }
    },
    updateAssetLibraryState() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.insertAssetToActiveSlide('hero'), true);
  assert.deepEqual(calls, [['img', 'Auto: Inserted Asset "Hero"']]);
  assert.equal(attributes['data-asset-id'], 'hero');
  assert.equal(element.src, '/images/hero.png');
  assert.equal(context.insertAssetToActiveSlide('missing'), false);
});

test('asset library state resolves relative previews against the current presentation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAssetLibraryState(doc = getIframeDoc()) {',
    '\n\n    function updateTemplateActionState'
  );
  let receivedOptions = null;
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    selectedElements: [],
    document: {
      baseURI: 'http://localhost:3000/index.html'
    },
    URL,
    buildEditorCanonicalDeck() {
      return { assets: [] };
    },
    SlideNextStudioEditorAssetView: {
      syncStudioAssetState(options) {
        receivedOptions = options;
        return true;
      }
    },
    isElementLocked() {},
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateAssetLibraryState(), true);
  assert.equal(
    receivedOptions.resolvePreviewSource('assets/hero.png'),
    'http://localhost:3000/presentations/demo/assets/hero.png'
  );
});

test('asset library state prefers canonical lock metadata when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const source = extractFunctionSource(
    fileContent,
    'function updateAssetLibraryState(doc = getIframeDoc()) {',
    '\n\n    function updateTemplateActionState'
  );
  const doc = { id: 'doc' };
  const selectedElement = { tagName: 'IMG', dataset: { editorId: 'node-1' } };
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', type: 'image' }],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { locked: true } }]
    }]
  });
  let receivedOptions = null;
  const context = {
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorAssetView: {
      syncStudioAssetState(options) {
        receivedOptions = options;
        return options.isElementLocked(selectedElement);
      }
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return canonicalDeck;
    },
    document: {},
    getIframeDoc() {
      return doc;
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    },
    resolveEditorCanonicalNodeForElement(element, deck) {
      return deck.slides[0].nodes.find((node) => node.id === element.dataset.editorId) || null;
    },
    selectedElements: [selectedElement]
  };

  vm.createContext(context);
  vm.runInContext(`${visibilityReaderSource}\n${source}`, context);

  assert.equal(context.updateAssetLibraryState(doc), true);
  assert.equal(receivedOptions.selectedElement, selectedElement);
  assert.equal(receivedOptions.isElementLocked(selectedElement), true);
});
