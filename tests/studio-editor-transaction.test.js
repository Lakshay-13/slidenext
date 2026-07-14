const test = require('node:test');
const assert = require('node:assert/strict');

const transaction = require('../shared/studio-editor-transaction.js');

function createStyleElement(editorId, initialStyle = {}) {
  return {
    dataset: { editorId },
    style: { ...initialStyle }
  };
}

test('createStudioStyleTransaction keeps only changed style properties', () => {
  const element = createStyleElement('node-1');

  assert.deepEqual(transaction.createStudioStyleTransaction([{
    element,
    before: { left: '10px', top: '20px', opacity: 1 },
    after: { left: '30px', top: '20px', opacity: 1 }
  }]), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '10px' },
      after: { left: '30px' }
    }]
  });
});

test('createStudioStyleTransaction returns null without valid changed targets', () => {
  assert.equal(transaction.createStudioStyleTransaction([
    { before: { left: '0px' }, after: { left: '1px' } },
    { elementId: 'node-1', before: { left: '1px' }, after: { left: '1px' } }
  ]), null);
});

test('applyStudioEditorTransaction applies before and after style patches', () => {
  const element = createStyleElement('node-1', { left: '10px', top: '20px' });
  const styleTransaction = transaction.createStudioStyleTransaction([{
    element,
    before: { left: '10px', top: '20px' },
    after: { left: '30px', top: '40px' }
  }]);
  const getElementById = (editorId) => editorId === 'node-1' ? element : null;

  assert.deepEqual(transaction.applyStudioEditorTransaction(styleTransaction, 'redo', { getElementById }), {
    didApply: true,
    appliedCount: 1,
    direction: 'redo'
  });
  assert.deepEqual(element.style, { left: '30px', top: '40px' });
  assert.deepEqual(transaction.applyStudioEditorTransaction(styleTransaction, 'undo', { getElementById }), {
    didApply: true,
    appliedCount: 1,
    direction: 'undo'
  });
  assert.deepEqual(element.style, { left: '10px', top: '20px' });
});

test('applyStudioEditorTransaction fails atomically when a target is missing', () => {
  const element = createStyleElement('node-1', { left: '10px' });
  const styleTransaction = transaction.createStudioStyleTransaction([
    { element, before: { left: '10px' }, after: { left: '30px' } },
    { elementId: 'node-2', before: { top: '10px' }, after: { top: '30px' } }
  ]);

  assert.deepEqual(transaction.applyStudioEditorTransaction(styleTransaction, 'redo', {
    getElementById(editorId) {
      return editorId === 'node-1' ? element : null;
    }
  }), {
    didApply: false,
    appliedCount: 0,
    direction: 'redo'
  });
  assert.deepEqual(element.style, { left: '10px' });
});

test('normalizeStudioEditorTransaction rejects other transaction formats', () => {
  assert.equal(transaction.normalizeStudioEditorTransaction({ kind: 'other' }), null);
  assert.equal(transaction.isStudioEditorTransaction({ kind: 'other' }), false);
});
