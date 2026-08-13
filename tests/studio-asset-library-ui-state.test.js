const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assetView = require('../shared/studio-editor-asset-view.js');
const assetState = require('../shared/studio-editor-asset-state.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalReaderAdapter = require('../shared/studio-editor-canonical-reader-adapter.js');
const selectionFixture = require('./helpers/studio-selection-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = selectionFixture.extractSelectionAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function runSourceWithCanonicalUi(source, context) {
  context.SlideNextStudioEditorCanonicalReaderAdapter = canonicalReaderAdapter;
  context.SlideNextStudioEditorAssetState = assetState;
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorUiCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorMutationCanonicalDeck'
  );
  const canonicalUiSource = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'studio-editor-canonical-ui.js'),
    'utf8'
  );
  vm.runInContext(`${canonicalUiSource}\n${resolverSource}\n${source}`, context);
}

test('asset runtime wiring prefers the live canonical deck resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorAssetRuntime =');
  const runtimeEnd = fileContent.indexOf('const studioEditorAssetController =', runtimeStart);
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);

  const runtimeSource = fileContent.slice(runtimeStart, runtimeEnd);
  const callbackStart = runtimeSource.indexOf('getCanonicalDeck:');
  const callbackEnd = runtimeSource.indexOf('\n          getCanonicalDeckBaseline', callbackStart);
  assert.notEqual(callbackStart, -1);
  assert.notEqual(callbackEnd, -1);

  const callbackExpression = runtimeSource
    .slice(callbackStart + 'getCanonicalDeck:'.length, callbackEnd)
    .trim()
    .replace(/,$/, '');
  const sourceDoc = { id: 'asset-runtime-doc' };
  const liveCanonicalDeck = { assets: [{ id: 'live-asset' }] };
  let receivedDoc = null;
  const getCanonicalDeck = vm.runInNewContext(`(${callbackExpression})`, {
    getIframeDoc() {
      return sourceDoc;
    },
    resolveEditorUiCanonicalDeck(doc) {
      receivedDoc = doc;
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('DOM rebuild should not run when live asset runtime state is available');
    }
  });

  assert.equal(getCanonicalDeck(), liveCanonicalDeck);
  assert.equal(receivedDoc, sourceDoc);
});

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

test('shared asset view explains how to populate an empty library', () => {
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
    createElement() {
      return { textContent: '' };
    }
  };

  assert.equal(assetView.renderStudioAssetLibrary({ documentRef, assets: [] }), true);
  assert.equal(
    list.children[0].textContent,
    'No assets saved. Add an asset above to reuse it.'
  );
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

test('shared asset state disables asset creation controls without a canonical deck', () => {
  const controls = {
    assetNameInput: { disabled: false },
    assetSourceInput: { disabled: false },
    addAssetBtn: { disabled: false }
  };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const documentRef = {
    getElementById(id) {
      return controls[id] || list;
    },
    createElement() {
      return { textContent: '' };
    }
  };

  assert.equal(assetView.syncStudioAssetState({
    documentRef,
    assets: [],
    canAddAsset: false
  }), true);
  assert.equal(controls.assetNameInput.disabled, true);
  assert.equal(controls.assetSourceInput.disabled, true);
  assert.equal(controls.addAssetBtn.disabled, true);

  assert.equal(assetView.syncStudioAssetState({
    documentRef,
    assets: [],
    canAddAsset: true
  }), true);
  assert.equal(controls.assetNameInput.disabled, false);
  assert.equal(controls.assetSourceInput.disabled, false);
  assert.equal(controls.addAssetBtn.disabled, false);
});

test('createStudioAssetStateSync resolves asset state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const calls = [];
  const syncState = assetView.createStudioAssetStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { assets: [] };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return id === 'savedAssetsList' ? list : null;
        },
        createElement() {
          return { textContent: '' };
        }
      };
    }
  });

  assert.equal(syncState(), true);
  assert.deepEqual(calls, [
    'document',
    ['action-state', doc],
    'document-ref'
  ]);
  assert.equal(list.children[0].textContent, 'No assets saved. Add an asset above to reuse it.');
});

test('createStudioAssetStateSync fails closed when asset state resolution throws', () => {
  const syncState = assetView.createStudioAssetStateSync({
    getActionState() {
      throw new Error('asset state unavailable');
    }
  });

  assert.equal(syncState(), false);
});

test('asset state exposes canonical-deck availability for asset creation controls', () => {
  const deck = { assets: [] };
  const controller = assetState.createStudioEditorAssetStateController({
    getCanonicalDeck: () => deck,
    getSelectedElements: () => []
  });
  assert.equal(controller.buildActionState({}).canAddAsset, true);

  const unavailableController = assetState.createStudioEditorAssetStateController({
    getCanonicalDeck: () => null,
    getSelectedElements: () => []
  });
  assert.equal(unavailableController.buildActionState({}).canAddAsset, false);
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
  runSourceWithCanonicalUi(source, context);

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
  runSourceWithCanonicalUi(source, context);

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
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.insertAssetToActiveSlide('hero'), true);
  assert.deepEqual(calls, [['img', 'Auto: Inserted Asset "Hero"']]);
  assert.equal(attributes['data-asset-id'], 'hero');
  assert.equal(element.src, '/images/hero.png');
  assert.equal(context.insertAssetToActiveSlide('missing'), false);
});

test('insertAssetToActiveSlide prefers live canonical asset metadata', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function addAssetToLibrary() {',
    '\n\n    function nudgeSelectedElements'
  );
  const element = {
    src: '',
    setAttribute() {}
  };
  const doc = { id: 'live-doc' };
  const calls = [];
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    document: { getElementById() { return { value: '' }; } },
    getIframeDoc() {
      return doc;
    },
    getStudioEditorSessionToken() {
      return 29;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 29);
      return { assets: [{ id: 'live-hero', name: 'Live Hero', src: '/images/live-hero.png' }] };
    },
    buildEditorCanonicalDeck() {
      throw new Error('DOM rebuild should not run when live asset metadata is available');
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
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.insertAssetToActiveSlide('live-hero'), true);
  assert.deepEqual(calls, [['img', 'Auto: Inserted Asset "Live Hero"']]);
  assert.equal(element.src, '/images/live-hero.png');
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
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateAssetLibraryState(), true);
  assert.equal(
    receivedOptions.resolvePreviewSource('assets/hero.png'),
    'http://localhost:3000/presentations/demo/assets/hero.png'
  );
});

test('updateAssetLibraryState caches the shared asset state synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAssetLibraryState(doc = getIframeDoc()) {',
    '\n\n    function updateTemplateActionState'
  );
  const doc = { id: 'active-doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorAssetView: {
      syncStudioAssetState() {
        throw new Error('direct asset sync should not run');
      },
      createStudioAssetStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).assets.length === 1;
        };
      }
    },
    document: { baseURI: 'http://localhost:3000/index.html' },
    getIframeDoc() {
      return doc;
    },
    buildEditorCanonicalDeck() {
      return { assets: [{ id: 'hero' }] };
    },
    getStudioSelectedElements(currentDoc) {
      assert.equal(currentDoc, doc);
      return [];
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateAssetLibraryState(doc), true);
  assert.equal(context.updateAssetLibraryState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('asset library state prefers the live canonical deck before rebuilding from the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAssetLibraryState(doc = getIframeDoc()) {',
    '\n\n    function updateTemplateActionState'
  );
  const doc = { id: 'live-doc' };
  const liveCanonicalDeck = { assets: [{ id: 'live-asset' }] };
  let receivedOptions = null;
  let buildCalls = 0;
  const context = {
    SlideNextStudioEditorAssetView: {
      syncStudioAssetState(options) {
        receivedOptions = options;
        return true;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getStudioEditorSessionToken() {
      return 17;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 17);
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when the live deck is available');
    },
    isElementLocked() {
      return false;
    },
    document: {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateAssetLibraryState(doc), true);
  assert.equal(receivedOptions.assets, liveCanonicalDeck.assets);
  assert.equal(buildCalls, 0);
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
  runSourceWithCanonicalUi(`${visibilityReaderSource}\n${source}`, context);

  assert.equal(context.updateAssetLibraryState(doc), true);
  assert.equal(receivedOptions.selectedElement, selectedElement);
  assert.equal(receivedOptions.isElementLocked(selectedElement), true);
});
