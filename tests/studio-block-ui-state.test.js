const test = require('node:test');
const assert = require('node:assert/strict');
const blockView = require('../shared/studio-editor-block-view.js');

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
