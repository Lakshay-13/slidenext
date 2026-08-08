const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assetView = require('../shared/studio-editor-asset-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('renderSavedAssets renders asset names and the empty state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function renderSavedAssets(assets = [], canApply = false) {',
    '\n\n    function updateAssetLibraryState'
  );
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
  const context = {
    SlideNextStudioEditorAssetView: assetView,
    document: {
      getElementById() {
        return list;
      },
      createElement() {
        return {
          textContent: '',
          children: [],
          addEventListener() {},
          appendChild(child) {
            this.children.push(child);
          },
          setAttribute() {}
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.renderSavedAssets([
    { id: 'hero', name: 'Hero', type: 'image', src: '/hero.png' }
  ]), true);
  assert.equal(list.children[0].children[0].textContent, 'Hero - image');
  assert.equal(context.renderSavedAssets([]), true);
  assert.equal(list.children[0].textContent, 'No assets saved');
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
    }
  }), true);

  events.find((event) => event.type === 'click').handler();
  events.reverse().find((event) => event.type === 'click').handler();
  assert.deepEqual(calls, [['apply', 'hero'], ['remove', 'hero']]);
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
