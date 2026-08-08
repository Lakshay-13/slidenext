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

test('renderSavedBlocks uses text content and shows the empty state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function renderSavedBlocks(blocks = []) {',
    '\n\n    function renderSavedTemplates'
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
    SlideNextStudioEditorBlockView: blockView,
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
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    insertSavedBlock() {},
    removeSavedBlock() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.renderSavedBlocks([
    { name: '<Hero>', nodes: [{ id: 'title' }] }
  ]), true);
  assert.equal(list.children[0].children[0].textContent, '<Hero> - 1 element');
  assert.equal(context.renderSavedBlocks([]), true);
  assert.equal(list.children[0].textContent, 'No reusable blocks saved');
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
