const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const blockView = require('../shared/studio-editor-block-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function runSourceWithCanonicalUi(source, context) {
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

test('block runtime wiring prefers the live canonical deck resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorBlockRuntime =');
  const runtimeEnd = fileContent.indexOf('const studioEditorBlockController =', runtimeStart);
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
  const sourceDoc = { id: 'block-runtime-doc' };
  const liveCanonicalDeck = { blocks: [{ id: 'live-block' }] };
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
      throw new Error('DOM rebuild should not run when live block runtime state is available');
    }
  });

  assert.equal(getCanonicalDeck(), liveCanonicalDeck);
  assert.equal(receivedDoc, sourceDoc);
});

test('shared block view wires insert and remove actions to injected callbacks', () => {
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

  assert.equal(blockView.renderStudioBlockLibrary({
    documentRef,
    blocks: [{ id: 'hero', name: 'Hero', nodes: [{ id: 'title' }] }],
    canInsert: true,
    insertBlock(blockId) {
      calls.push(['insert', blockId]);
    },
    removeBlock(blockId) {
      calls.push(['remove', blockId]);
    }
  }), true);

  events.find((event) => event.type === 'click').handler();
  events.reverse().find((event) => event.type === 'click').handler();
  assert.deepEqual(calls, [['insert', 'hero'], ['remove', 'hero']]);
});

test('shared block state sync updates block controls before rendering the library', () => {
  const controls = {
    saveSelectionBlockBtn: { disabled: false },
    blockNameInput: { disabled: false }
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
      return controls[id] || (id === 'savedBlocksList' ? list : null);
    },
    createElement() {
      return { textContent: '' };
    }
  };

  assert.equal(blockView.syncStudioBlockState({
    documentRef,
    blocks: [],
    canUseBlockActions: false
  }), true);
  assert.equal(controls.saveSelectionBlockBtn.disabled, true);
  assert.equal(controls.blockNameInput.disabled, true);
  assert.equal(
    list.children[0].textContent,
    'No reusable blocks saved. Select elements and save a block.'
  );
});

test('createStudioBlockStateSync resolves block state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const controls = {
    saveSelectionBlockBtn: { disabled: true },
    blockNameInput: { disabled: true }
  };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const calls = [];
  const syncState = blockView.createStudioBlockStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { blocks: [], canUseBlockActions: false };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return controls[id] || (id === 'savedBlocksList' ? list : null);
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
  assert.equal(controls.saveSelectionBlockBtn.disabled, true);
});

test('createStudioBlockStateSync fails closed when block state resolution throws', () => {
  const syncState = blockView.createStudioBlockStateSync({
    getActionState() {
      throw new Error('block state unavailable');
    }
  });

  assert.equal(syncState(), false);
});

test('updateBlockActionState caches the shared block state synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateBlockActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );
  const doc = { id: 'active-doc', activeSlide: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorBlockView: {
      syncStudioBlockState() {
        throw new Error('direct block sync should not run');
      },
      createStudioBlockStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canUseBlockActions;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      return currentDoc.activeSlide;
    },
    getStudioSelectedElements(currentDoc) {
      assert.equal(currentDoc, doc);
      return [{ id: 'selected' }];
    },
    selectionHasLockedElements(_elements, currentDoc) {
      assert.equal(currentDoc, doc);
      return false;
    },
    buildEditorCanonicalDeck() {
      return { blocks: [{ id: 'hero' }] };
    },
    insertSavedBlock() {},
    removeSavedBlock() {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateBlockActionState(doc), true);
  assert.equal(context.updateBlockActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('block state prefers the live canonical deck before rebuilding from the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateBlockActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );
  const doc = { id: 'live-doc', activeSlide: {} };
  const liveCanonicalDeck = { blocks: [{ id: 'live-block' }] };
  let receivedOptions = null;
  let buildCalls = 0;
  const context = {
    SlideNextStudioEditorBlockView: {
      syncStudioBlockState(options) {
        receivedOptions = options;
        return true;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      return currentDoc.activeSlide;
    },
    getStudioEditorSessionToken() {
      return 37;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 37);
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when the live deck is available');
    },
    getStudioSelectedElements() {
      return [{ id: 'selected' }];
    },
    selectionHasLockedElements() {
      return false;
    },
    insertSavedBlock() {},
    removeSavedBlock() {},
    document: {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateBlockActionState(doc), true);
  assert.equal(receivedOptions.blocks, liveCanonicalDeck.blocks);
  assert.equal(buildCalls, 0);
});
