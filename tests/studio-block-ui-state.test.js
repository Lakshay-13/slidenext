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
    getStudioSelectedElements() {
      return [{ id: 'selected' }];
    },
    selectionHasLockedElements() {
      return false;
    },
    buildEditorCanonicalDeck() {
      return { blocks: [{ id: 'hero' }] };
    },
    insertSavedBlock() {},
    removeSavedBlock() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateBlockActionState(doc), true);
  assert.equal(context.updateBlockActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});
