const test = require('node:test');
const assert = require('node:assert/strict');
const elementInsertionController = require('../shared/studio-editor-element-insertion-controller.js');

test('element insertion controller preserves insertion finalization and version labeling', () => {
  const calls = [];
  const slide = { children: [{}, {}] };
  const doc = { id: 'doc' };
  const element = { id: 'element-1' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    getIframeDoc: () => doc,
    getActiveSlide: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (type, options) => {
      calls.push(['apply', type, options]);
      return { element, transaction: { id: 'tx-1' } };
    },
    finalizeInsertedElements: (...args) => {
      calls.push(['finalize', ...args]);
      return true;
    }
  });

  assert.equal(controller.insert('h2'), true);
  assert.equal(calls[0][0], 'apply');
  assert.equal(calls[0][1], 'h2');
  assert.equal(calls[0][2].offset, 30);
  assert.equal(calls[0][2].transactionElementId, 'slide:slide-1');
  assert.deepEqual(calls[1], [
    'finalize',
    [element],
    'Auto: Added H2',
    { id: 'tx-1' },
    null
  ]);
});

test('element insertion controller refreshes insertion state when no active slide exists', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    getIframeDoc: () => doc,
    getActiveSlide: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return null;
    },
    updateInsertionActionState: (currentDoc) => calls.push(currentDoc)
  });

  assert.equal(controller.insert('h2'), false);
  assert.deepEqual(calls, [doc]);
});
