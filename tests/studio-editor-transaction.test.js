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

test('createStudioPositionTransaction derives reversible left and top patches', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px', top: '20px' }
  };

  assert.deepEqual(transaction.createStudioPositionTransaction([{
    element,
    nextLeft: 30,
    nextTop: 40
  }]), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '10px', top: '20px' },
      after: { left: '30px', top: '40px' }
    }]
  });
});

test('createStudioActiveSlideTransaction stores a reversible view-only operation', () => {
  assert.deepEqual(transaction.createStudioActiveSlideTransaction(' slide-1 ', 'slide-2'), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'active-slide',
      before: 'slide-1',
      after: 'slide-2'
    }]
  });
  assert.equal(transaction.createStudioActiveSlideTransaction('slide-1', 'slide-1'), null);
});

test('createStudioSlideOrderTransaction stores only a changed complete slide order', () => {
  const slideOrderTransaction = transaction.createStudioSlideOrderTransaction(
    [' slide-1 ', 'slide-2'],
    ['slide-2', 'slide-1']
  );

  assert.deepEqual(slideOrderTransaction, {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'slide-order',
      before: ['slide-1', 'slide-2'],
      after: ['slide-2', 'slide-1']
    }]
  });
  assert.equal(transaction.createStudioSlideOrderTransaction(['slide-1'], ['slide-2']), null);
  assert.equal(transaction.createStudioSlideOrderTransaction(['slide-1'], ['slide-1']), null);
  assert.equal(transaction.createStudioSlideOrderTransaction(
    ['slide-1', 'slide-1', 'slide-2'],
    ['slide-2', 'slide-1']
  ), null);
});

test('applyStudioEditorTransaction replays slide-order operations without resolving element ids', () => {
  const order = [];
  const slideOrderTransaction = transaction.createStudioSlideOrderTransaction(
    ['slide-1', 'slide-2'],
    ['slide-2', 'slide-1']
  );

  assert.deepEqual(transaction.applyStudioEditorTransaction(slideOrderTransaction, 'redo', {
    getElementById() {
      throw new Error('slide-order should not resolve an element');
    },
    applySlideOrderState(slideIds) {
      order.push(slideIds);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'redo'
  });
  assert.deepEqual(transaction.applyStudioEditorTransaction(slideOrderTransaction, 'undo', {
    applySlideOrderState(slideIds) {
      order.push(slideIds);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'undo'
  });
  assert.deepEqual(order, [
    ['slide-2', 'slide-1'],
    ['slide-1', 'slide-2']
  ]);
});

test('slide-presence transactions replay a scoped slide snapshot without resolving an element', () => {
  const slidePresenceTransaction = transaction.createStudioSlidePresenceTransaction([{
    slideId: 'slide-2',
    before: { exists: false, index: 1, markup: '' },
    after: { exists: true, index: 1, markup: '<section id="slide-2"></section>' }
  }]);
  const applied = [];

  assert.deepEqual(transaction.applyStudioEditorTransaction(slidePresenceTransaction, 'redo', {
    getElementById() {
      throw new Error('slide-presence should not resolve an element');
    },
    applySlidePresenceState(slideId, snapshot) {
      applied.push([slideId, snapshot]);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'redo'
  });
  assert.deepEqual(transaction.applyStudioEditorTransaction(slidePresenceTransaction, 'undo', {
    applySlidePresenceState(slideId, snapshot) {
      applied.push([slideId, snapshot]);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'undo'
  });
  assert.deepEqual(applied, [
    ['slide-2', { exists: true, index: 1, markup: '<section id="slide-2"></section>' }],
    ['slide-2', { exists: false, index: 1, markup: '' }]
  ]);
});

test('element-presence transactions replay a scoped inserted node without resolving an element', () => {
  const elementPresenceTransaction = transaction.createStudioElementPresenceTransaction([{
    elementId: 'node-2',
    parentId: 'slide:slide-1',
    before: { exists: false, index: 0, markup: '' },
    after: { exists: true, index: 0, markup: '<h2 data-editor-id="node-2">Heading</h2>' }
  }]);
  const applied = [];

  assert.deepEqual(transaction.applyStudioEditorTransaction(elementPresenceTransaction, 'redo', {
    getElementById() {
      throw new Error('element-presence should not resolve an element');
    },
    applyElementPresenceState(elementId, parentId, snapshot) {
      applied.push([elementId, parentId, snapshot]);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'redo'
  });
  assert.deepEqual(transaction.applyStudioEditorTransaction(elementPresenceTransaction, 'undo', {
    applyElementPresenceState(elementId, parentId, snapshot) {
      applied.push([elementId, parentId, snapshot]);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'undo'
  });
  assert.deepEqual(applied, [
    ['node-2', 'slide:slide-1', {
      exists: true,
      index: 0,
      markup: '<h2 data-editor-id="node-2">Heading</h2>'
    }],
    ['node-2', 'slide:slide-1', { exists: false, index: 0, markup: '' }]
  ]);
});

test('applyStudioEditorTransaction replays active-slide operations without resolving an element', () => {
  const activeSlideIds = [];
  const activeSlideTransaction = transaction.createStudioActiveSlideTransaction('slide-1', 'slide-2');

  assert.deepEqual(transaction.applyStudioEditorTransaction(activeSlideTransaction, 'redo', {
    applyActiveSlideState(slideId) {
      activeSlideIds.push(slideId);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'redo'
  });
  assert.deepEqual(transaction.applyStudioEditorTransaction(activeSlideTransaction, 'undo', {
    applyActiveSlideState(slideId) {
      activeSlideIds.push(slideId);
      return true;
    }
  }), {
    didApply: true,
    appliedCount: 1,
    direction: 'undo'
  });
  assert.deepEqual(activeSlideIds, ['slide-2', 'slide-1']);
});

test('applyStudioPositionLayoutWithTransaction delegates layout application and preserves transaction context', () => {
  const first = { style: { left: '10px', top: '20px' } };
  const calls = [];
  const result = transaction.applyStudioPositionLayoutWithTransaction([
    { element: first, nextLeft: 40, nextTop: 50 }
  ], {
    createPositionTransaction(items, options) {
      calls.push(['createPositionTransaction', items, options]);
      return { type: 'position' };
    },
    getElementId(element) {
      return element;
    },
    applyLayout(items, options) {
      calls.push(['applyLayout', items, options]);
      items[0].element.style.left = `${items[0].nextLeft}px`;
      items[0].element.style.top = `${items[0].nextTop}px`;
      return { didApply: true, transaction: { type: 'delegated' } };
    }
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(first.style, { left: '40px', top: '50px' });
  assert.equal(result.transaction.type, 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'applyLayout');
  assert.equal(calls[0][2].createPositionTransaction instanceof Function, true);
});

test('applyStudioPositionLayoutWithTransaction applies a direct layout when no delegate is provided', () => {
  const first = { style: { left: '10px', top: '20px' } };
  const result = transaction.applyStudioPositionLayoutWithTransaction([
    { element: first, nextLeft: 40, nextTop: 50 }
  ]);

  assert.deepEqual(result, { didApply: true, transaction: null });
  assert.deepEqual(first.style, { left: '40px', top: '50px' });
});

test('applyStudioPositionLayoutWithTransaction preserves missing coordinates', () => {
  const first = { style: { left: '10px', top: '20px' } };
  const second = { style: { left: '30px', top: '40px' } };

  const result = transaction.applyStudioPositionLayoutWithTransaction([
    { element: first, nextLeft: 40 },
    { element: second, nextLeft: 'invalid', nextTop: undefined }
  ]);

  assert.deepEqual(result, { didApply: true, transaction: null });
  assert.deepEqual(first.style, { left: '40px', top: '20px' });
  assert.deepEqual(second.style, { left: '30px', top: '40px' });
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

test('applyStudioEditorTransaction reverses compound operation order during undo', () => {
  const first = { dataset: { editorId: 'node-1' } };
  const second = { dataset: { editorId: 'node-2' } };
  const markupTransaction = transaction.createStudioMarkupTransaction([
    { element: first, before: '<p>first-before</p>', after: '<p>first-after</p>' },
    { element: second, before: '<p>second-before</p>', after: '<p>second-after</p>' }
  ]);
  const calls = [];

  const applyOptions = {
    getElementById(editorId) {
      return editorId === 'node-1' ? first : second;
    }
  };
  transaction.applyStudioEditorTransaction(markupTransaction, 'redo', {
    ...applyOptions,
    applyMarkupState(element, markup) {
      calls.push(['redo-apply', element.dataset.editorId, markup]);
      return true;
    }
  });
  transaction.applyStudioEditorTransaction(markupTransaction, 'undo', {
    ...applyOptions,
    applyMarkupState(element, markup) {
      calls.push(['undo-apply', element.dataset.editorId, markup]);
      return true;
    }
  });

  assert.deepEqual(calls, [
    ['redo-apply', 'node-1', '<p>first-after</p>'],
    ['redo-apply', 'node-2', '<p>second-after</p>'],
    ['undo-apply', 'node-2', '<p>second-before</p>'],
    ['undo-apply', 'node-1', '<p>first-before</p>']
  ]);
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

test('createStudioPropertyTransaction and applyStudioEditorTransaction handle reversible element properties', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    textContent: 'Before',
    src: '/before.png'
  };
  const propertyTransaction = transaction.createStudioPropertyTransaction([
    { element, property: 'textContent', before: element.textContent, after: 'After' },
    { element, property: 'src', before: element.src, after: '/after.png' }
  ]);

  assert.deepEqual(propertyTransaction.operations, [
    { type: 'property', elementId: 'node-1', property: 'textContent', before: 'Before', after: 'After' },
    { type: 'property', elementId: 'node-1', property: 'src', before: '/before.png', after: '/after.png' }
  ]);
  const getElementById = (editorId) => editorId === 'node-1' ? element : null;
  assert.equal(transaction.applyStudioEditorTransaction(propertyTransaction, 'redo', { getElementById }).didApply, true);
  assert.equal(element.textContent, 'After');
  assert.equal(element.src, '/after.png');
  assert.equal(transaction.applyStudioEditorTransaction(propertyTransaction, 'undo', { getElementById }).didApply, true);
  assert.equal(element.textContent, 'Before');
  assert.equal(element.src, '/before.png');
});

test('createStudioDatasetTransaction applies and removes reversible dataset state', () => {
  const element = {
    dataset: { editorId: 'node-1' }
  };
  const datasetTransaction = transaction.createStudioDatasetTransaction([{
    element,
    property: 'editorLocked',
    before: '',
    after: 'true'
  }]);
  const getElementById = (editorId) => editorId === 'node-1' ? element : null;

  assert.deepEqual(datasetTransaction.operations, [{
    type: 'dataset',
    elementId: 'node-1',
    property: 'editorLocked',
    before: '',
    after: 'true'
  }]);
  assert.equal(transaction.applyStudioEditorTransaction(datasetTransaction, 'redo', { getElementById }).didApply, true);
  assert.equal(element.dataset.editorLocked, 'true');
  assert.equal(transaction.applyStudioEditorTransaction(datasetTransaction, 'undo', { getElementById }).didApply, true);
  assert.equal(Object.prototype.hasOwnProperty.call(element.dataset, 'editorLocked'), false);
});

test('createStudioVisibilityTransaction applies reversible visibility state through its adapter', () => {
  const element = {
    dataset: { editorId: 'node-1' }
  };
  const before = {
    hidden: false,
    display: 'flex',
    ariaHidden: null,
    hasHiddenClass: false,
    dataset: {}
  };
  const after = {
    hidden: true,
    display: 'none',
    ariaHidden: 'true',
    hasHiddenClass: true,
    dataset: {
      editorHidden: 'true',
      editorPrevDisplay: 'flex',
      editorPrevAriaHidden: ''
    }
  };
  const visibilityTransaction = transaction.createStudioVisibilityTransaction([{
    element,
    before,
    after
  }]);
  const appliedStates = [];
  const getElementById = (editorId) => editorId === 'node-1' ? element : null;
  const applyVisibilityState = (target, state) => {
    assert.equal(target, element);
    appliedStates.push(state);
    return true;
  };

  assert.deepEqual(visibilityTransaction.operations, [{
    type: 'visibility',
    elementId: 'node-1',
    before,
    after
  }]);
  assert.equal(transaction.applyStudioEditorTransaction(
    visibilityTransaction,
    'redo',
    { getElementById, applyVisibilityState }
  ).didApply, true);
  assert.equal(transaction.applyStudioEditorTransaction(
    visibilityTransaction,
    'undo',
    { getElementById, applyVisibilityState }
  ).didApply, true);
  assert.deepEqual(appliedStates, [after, before]);
});

test('createStudioMarkupTransaction applies scoped container markup through its adapter', () => {
  const element = {
    dataset: { editorId: 'slide-1' }
  };
  const markupTransaction = transaction.createStudioMarkupTransaction([{
    element,
    before: '<div data-editor-id="node-1">A</div>',
    after: '<div data-editor-id="node-2">B</div>'
  }]);
  const appliedMarkup = [];
  const getElementById = (editorId) => editorId === 'slide-1' ? element : null;

  assert.deepEqual(markupTransaction.operations, [{
    type: 'markup',
    elementId: 'slide-1',
    before: '<div data-editor-id="node-1">A</div>',
    after: '<div data-editor-id="node-2">B</div>'
  }]);
  assert.equal(transaction.applyStudioEditorTransaction(
    markupTransaction,
    'redo',
    {
      getElementById,
      applyMarkupState(target, markup) {
        assert.equal(target, element);
        appliedMarkup.push(markup);
        return true;
      }
    }
  ).didApply, true);
  assert.equal(transaction.applyStudioEditorTransaction(
    markupTransaction,
    'undo',
    {
      getElementById,
      applyMarkupState(target, markup) {
        assert.equal(target, element);
        appliedMarkup.push(markup);
        return true;
      }
    }
  ).didApply, true);
  assert.deepEqual(appliedMarkup, [
    '<div data-editor-id="node-2">B</div>',
    '<div data-editor-id="node-1">A</div>'
  ]);
});

test('applyStudioEditorTransaction rolls back earlier operations when an adapter rejects', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px' },
    innerHTML: '<div>Before</div>'
  };
  const mixedTransaction = {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [
      { type: 'style', elementId: 'node-1', before: { left: '10px' }, after: { left: '30px' } },
      { type: 'markup', elementId: 'node-1', before: '<div>Before</div>', after: '<div>After</div>' }
    ]
  };
  const appliedMarkup = [];

  const result = transaction.applyStudioEditorTransaction(mixedTransaction, 'redo', {
    getElementById: () => element,
    applyMarkupState(target, markup) {
      assert.equal(target, element);
      appliedMarkup.push(markup);
      return false;
    }
  });

  assert.deepEqual(result, {
    didApply: false,
    appliedCount: 0,
    direction: 'redo'
  });
  assert.equal(element.style.left, '10px');
  assert.equal(element.innerHTML, '<div>Before</div>');
  assert.deepEqual(appliedMarkup, ['<div>After</div>', '<div>Before</div>']);
});

test('createStudioMarkupTransactionCapture snapshots markup once and creates a transaction after mutation', () => {
  const element = {
    dataset: { editorId: 'parent-1' },
    innerHTML: '<div>A</div>'
  };
  const markupCapture = transaction.createStudioMarkupTransactionCapture([
    { element },
    { element, elementId: 'parent-1' }
  ]);

  element.innerHTML = '<div>B</div>';

  assert.deepEqual(markupCapture.createTransaction(), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'markup',
      elementId: 'parent-1',
      before: '<div>A</div>',
      after: '<div>B</div>'
    }]
  });
});

test('mergeStudioStyleTransactions coalesces sequential changes per element', () => {
  const first = transaction.createStudioStyleTransaction([{
    elementId: 'node-1',
    before: { left: '0px', top: '0px' },
    after: { left: '10px', top: '0px' }
  }]);
  const second = transaction.createStudioStyleTransaction([{
    elementId: 'node-1',
    before: { left: '10px', top: '0px' },
    after: { left: '20px', top: '5px' }
  }]);

  assert.deepEqual(transaction.mergeStudioStyleTransactions(first, second), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '0px', top: '0px' },
      after: { left: '20px', top: '5px' }
    }]
  });
});

test('mergeStudioEditorTransactions coalesces mixed style and property changes', () => {
  const styleTransaction = transaction.createStudioStyleTransaction([{
    elementId: 'node-1',
    before: { left: '0px' },
    after: { left: '10px' }
  }]);
  const propertyTransaction = transaction.createStudioPropertyTransaction([{
    elementId: 'node-1',
    property: 'textContent',
    before: 'Before',
    after: 'After'
  }]);

  assert.deepEqual(transaction.mergeStudioEditorTransactions(styleTransaction, propertyTransaction).operations, [
    { type: 'style', elementId: 'node-1', before: { left: '0px' }, after: { left: '10px' } },
    { type: 'property', elementId: 'node-1', property: 'textContent', before: 'Before', after: 'After' }
  ]);
});

test('mergeStudioEditorTransactions coalesces deck-wide slide-order changes', () => {
  const first = transaction.createStudioSlideOrderTransaction(
    ['slide-1', 'slide-2', 'slide-3'],
    ['slide-2', 'slide-1', 'slide-3']
  );
  const second = transaction.createStudioSlideOrderTransaction(
    ['slide-2', 'slide-1', 'slide-3'],
    ['slide-2', 'slide-3', 'slide-1']
  );

  assert.deepEqual(transaction.mergeStudioEditorTransactions(first, second), {
    kind: transaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: transaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'slide-order',
      before: ['slide-1', 'slide-2', 'slide-3'],
      after: ['slide-2', 'slide-3', 'slide-1']
    }]
  });
});

test('normalizeStudioEditorTransaction rejects other transaction formats', () => {
  assert.equal(transaction.normalizeStudioEditorTransaction({ kind: 'other' }), null);
  assert.equal(transaction.isStudioEditorTransaction({ kind: 'other' }), false);
});
