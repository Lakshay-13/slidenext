const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styleState = require('../shared/studio-editor-style.js');
const transactionState = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const STYLE_TOOLBAR_STATE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-style-toolbar-state.js'
);

test('editor forwards the style toolbar document into the selection reader', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toolbarStateSource = fs.readFileSync(STYLE_TOOLBAR_STATE_PATH, 'utf8');

  assert.match(source, /createStudioEditorStyleToolbarStateController/);
  assert.match(toolbarStateSource, /getSelectedElements\(doc\)/);
  assert.match(toolbarStateSource, /getDocumentRef: \(\) => documentRef/);
});

function createElement(tagName = 'div') {
  return {
    isConnected: true,
    tagName,
    style: {},
    textContent: '',
    src: ''
  };
}

test('editor chrome allows text selection while a node is being edited inline', () => {
  const css = styleState.getStudioEditorStyleText();
  assert.match(css, /\[data-editor-inline-editing="true"\]/);
  assert.match(css, /user-select: text !important/);
});

test('buildStudioStyleMutationPlan filters stale selections, blocks locked selections, respects deck readiness, and maps version labels', () => {
  const stale = { isConnected: false, locked: false };
  const live = { isConnected: true, locked: false };
  const locked = { isConnected: true, locked: true };

  assert.deepEqual(styleState.buildStudioStyleMutationPlan([stale, live], 'align', 'center', {
    isLocked: (element) => !!element.locked
  }), {
    selection: [live],
    prop: 'align',
    value: 'center',
    canApply: true,
    versionLabel: 'Auto: Changed Alignment'
  });

  assert.deepEqual(styleState.buildStudioStyleMutationPlan([live, locked], 'color', '#fff', {
    isLocked: (element) => !!element.locked
  }), {
    selection: [live, locked],
    prop: 'color',
    value: '#fff',
    canApply: false,
    versionLabel: ''
  });

  assert.deepEqual(styleState.buildStudioStyleMutationPlan([live], 'weight', '600', {
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    selection: [live],
    prop: 'weight',
    value: '600',
    canApply: false,
    versionLabel: 'Auto: Changed Font Weight'
  });

  assert.equal(
    styleState.buildStudioStyleMutationPlan([live], 'text', 'Edited', {
      isLocked: (element) => !!element.locked
    }).versionLabel,
    'Auto: Edited Text'
  );
});

test('buildStudioStyleToolbarState derives inspector control enablement from shared style mutation plans', () => {
  const live = { isConnected: true, locked: false };

  assert.deepEqual(
    styleState.buildStudioStyleToolbarState(
      [live],
      [
        ['elFontWeight', 'weight', '400'],
        ['alignCenterBtn', 'align', 'center']
      ],
      {
        isLocked: (element) => !!element.locked
      }
    ),
    {
      controlStates: {
        elFontWeight: true,
        alignCenterBtn: true
      }
    }
  );
});

test('createStudioStyleToolbarStateSync resolves live selection and slide readiness through callbacks', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const selectedElements = [{ id: 'node-1', isConnected: true }];
  const controls = {};
  const documentRef = {
    getElementById(id) {
      controls[id] ||= { disabled: true };
      return controls[id];
    }
  };
  const calls = [];
  const syncToolbar = styleState.createStudioStyleToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getSelectedElements(currentDoc) {
      calls.push('selection');
      assert.equal(currentDoc, doc);
      return selectedElements;
    },
    getActiveSlide(currentDoc) {
      calls.push(['active-slide', currentDoc]);
      return slide;
    },
    getLockedState(currentDoc) {
      calls.push(['locked-state', currentDoc]);
      return () => false;
    },
    getDocumentRef() {
      calls.push('document-ref');
      return documentRef;
    }
  });

  assert.equal(syncToolbar(), true);
  assert.equal(Object.values(controls).every((control) => control.disabled === false), true);
  assert.deepEqual(calls.slice(0, 4), [
    'document',
    'document-ref',
    'selection',
    ['locked-state', doc]
  ]);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === 'active-slide').length > 0, true);
});

test('renderStudioStyleToolbarState applies control availability to inspector inputs', () => {
  const controls = {
    elFontSize: { disabled: false },
    elTextColor: { disabled: false }
  };

  assert.equal(styleState.renderStudioStyleToolbarState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    toolbarState: {
      controlStates: {
        elFontSize: true,
        elTextColor: false
      }
    }
  }), true);
  assert.equal(controls.elFontSize.disabled, false);
  assert.equal(controls.elTextColor.disabled, true);
});

test('syncStudioStyleToolbarState builds and renders control availability in one shared operation', () => {
  const controls = {
    elFontWeight: { disabled: true },
    alignCenterBtn: { disabled: true }
  };
  const live = { isConnected: true, locked: false };

  assert.equal(styleState.syncStudioStyleToolbarState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    elements: [live],
    controlConfigs: [
      ['elFontWeight', 'weight', '400'],
      ['alignCenterBtn', 'align', 'center']
    ],
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => true
  }), true);
  assert.equal(controls.elFontWeight.disabled, false);
  assert.equal(controls.alignCenterBtn.disabled, false);
});

test('syncStudioStyleToolbarState uses the shared control configuration when none is provided', () => {
  const controls = {
    elFontWeight: { disabled: true },
    alignCenterBtn: { disabled: true }
  };

  assert.equal(styleState.syncStudioStyleToolbarState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    elements: [{ isConnected: true, locked: false }],
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => true
  }), true);
  assert.equal(controls.elFontWeight.disabled, false);
  assert.equal(controls.alignCenterBtn.disabled, false);
});

test('syncStudioStyleFeedbackLabel renders numeric inspector feedback with the correct unit', () => {
  const labels = {
    fontSizeVal: { textContent: '' },
    opacityVal: { textContent: '' }
  };
  const documentRef = {
    getElementById(id) {
      return labels[id] || null;
    }
  };

  assert.equal(styleState.syncStudioStyleFeedbackLabel({
    documentRef,
    prop: 'size',
    displayValue: '24'
  }), true);
  assert.equal(styleState.syncStudioStyleFeedbackLabel({
    documentRef,
    prop: 'opacity',
    displayValue: '80'
  }), true);
  assert.equal(labels.fontSizeVal.textContent, '24px');
  assert.equal(labels.opacityVal.textContent, '80%');
  assert.equal(styleState.syncStudioStyleFeedbackLabel({
    documentRef,
    prop: 'align',
    displayValue: 'center'
  }), false);
});

test('finalizeStudioStyleActionResult refreshes the inspector only for unsuccessful results', () => {
  const calls = [];

  assert.equal(styleState.finalizeStudioStyleActionResult(false, {
    syncInspectorForSelection() {
      calls.push('syncInspectorForSelection');
    }
  }), false);
  assert.equal(styleState.finalizeStudioStyleActionResult(true, {
    syncInspectorForSelection() {
      calls.push('unexpected-success-refresh');
    }
  }), true);
  assert.deepEqual(calls, ['syncInspectorForSelection']);
});

test('applyStudioStyleMutation applies shared style properties across the live selection', () => {
  const first = createElement('div');
  const second = createElement('p');

  const sizeResult = styleState.applyStudioStyleMutation([first, second], 'size', '24');
  assert.deepEqual(sizeResult, {
    didApply: true,
    displayValue: '24'
  });
  assert.equal(first.style.fontSize, '24px');
  assert.equal(second.style.fontSize, '24px');

  const opacityResult = styleState.applyStudioStyleMutation([first, second], 'opacity', '125');
  assert.deepEqual(opacityResult, {
    didApply: true,
    displayValue: '100'
  });
  assert.equal(first.style.opacity, '1');
  assert.equal(second.style.opacity, '1');
});

test('applyStudioStyleMutation applies rich text style properties across the live selection', () => {
  const first = createElement('p');
  const second = createElement('p');

  assert.deepEqual(styleState.applyStudioStyleMutation([first, second], 'italic', 'italic'), {
    didApply: true,
    displayValue: 'italic'
  });
  assert.deepEqual(styleState.applyStudioStyleMutation([first, second], 'underline', 'underline'), {
    didApply: true,
    displayValue: 'underline'
  });
  assert.deepEqual(styleState.applyStudioStyleMutation([first, second], 'lineHeight', '4'), {
    didApply: true,
    displayValue: '3'
  });
  assert.equal(first.style.fontStyle, 'italic');
  assert.equal(second.style.fontStyle, 'italic');
  assert.equal(first.style.textDecoration, 'underline');
  assert.equal(second.style.textDecoration, 'underline');
  assert.equal(first.style.lineHeight, '3');
  assert.equal(second.style.lineHeight, '3');
});

test('applyStudioStyleMutation normalizes invalid numeric inspector values', () => {
  const element = createElement();

  assert.deepEqual(styleState.applyStudioStyleMutation([element], 'size', 'not-a-number'), {
    didApply: true,
    displayValue: '16'
  });
  assert.equal(element.style.fontSize, '16px');

  assert.deepEqual(styleState.applyStudioStyleMutation([element], 'borderWidth', '-4'), {
    didApply: true,
    displayValue: '0'
  });
  assert.equal(element.style.borderWidth, '0px');

  assert.deepEqual(styleState.applyStudioStyleMutation([element], 'borderRadius', 'NaN'), {
    didApply: true,
    displayValue: '0'
  });
  assert.equal(element.style.borderRadius, '0px');
});

test('applyStudioStyleMutation skips inspector writes when the requested value is unchanged', () => {
  const element = createElement();
  element.style.color = '#fff';
  element.textContent = 'Headline';

  assert.deepEqual(styleState.applyStudioStyleMutation([element], 'color', '#fff'), {
    didApply: false,
    displayValue: '#fff'
  });
  assert.deepEqual(styleState.applyStudioStyleMutation([element], 'text', 'Headline'), {
    didApply: false,
    displayValue: 'Headline'
  });
  const transactionResult = styleState.applyStudioStyleMutationWithTransaction(
    [element],
    'color',
    '#fff',
    {
      createStyleTransaction: transactionState.createStudioStyleTransaction,
      getElementId: () => 'unchanged-style'
    }
  );
  assert.equal(transactionResult.didApply, false);
  assert.equal(transactionResult.transaction, null);
  assert.equal(element.style.color, '#fff');
  assert.equal(element.textContent, 'Headline');
});

test('applyStudioStyleMutation compares image sources against their raw attribute', () => {
  const image = createElement('img');
  image.src = '/asset.png';
  image.getAttribute = (name) => name === 'src' ? '/asset.png' : null;

  assert.deepEqual(styleState.applyStudioStyleMutation([image], 'src', '/asset.png'), {
    didApply: false,
    displayValue: '/asset.png'
  });
  assert.equal(image.src, '/asset.png');
});

test('applyStudioStyleMutation only edits the primary target for text and image source updates', () => {
  const first = createElement('div');
  const second = createElement('div');
  const image = createElement('img');

  assert.deepEqual(styleState.applyStudioStyleMutation([first, second], 'text', 'Headline'), {
    didApply: true,
    displayValue: 'Headline'
  });
  assert.equal(first.textContent, 'Headline');
  assert.equal(second.textContent, '');

  assert.deepEqual(styleState.applyStudioStyleMutation([image, second], 'src', '/asset.png'), {
    didApply: true,
    displayValue: '/asset.png'
  });
  assert.equal(image.src, '/asset.png');
  assert.equal(second.src, '');

  assert.deepEqual(styleState.applyStudioStyleMutation([first], 'src', '/ignored.png'), {
    didApply: false,
    displayValue: '/ignored.png'
  });
});

test('applyStudioStyleMutation applies image fit as a reversible style property', () => {
  const image = createElement('img');
  image.style.objectFit = 'fill';

  const result = styleState.applyStudioStyleMutationWithTransaction(
    [image],
    'objectFit',
    'cover',
    {
      createStyleTransaction: transactionState.createStudioStyleTransaction,
      getElementId: () => 'image-fit'
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(image.style.objectFit, 'cover');
  assert.deepEqual(result.transaction.operations[0].before, { objectFit: 'fill' });
  assert.deepEqual(result.transaction.operations[0].after, { objectFit: 'cover' });
});

test('applyStudioStyleMutation applies a supported image crop position as a reversible style property', () => {
  const image = createElement('img');
  image.style.objectPosition = 'center center';

  const result = styleState.applyStudioStyleMutationWithTransaction(
    [image],
    'objectPosition',
    'right bottom',
    {
      createStyleTransaction: transactionState.createStudioStyleTransaction,
      getElementId: () => 'image-position'
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(image.style.objectPosition, 'right bottom');
  assert.deepEqual(result.transaction.operations[0].before, { objectPosition: 'center center' });
  assert.deepEqual(result.transaction.operations[0].after, { objectPosition: 'right bottom' });
});

test('applyStudioStyleMutationWithTransaction applies a mutation and builds a reversible style or property transaction', () => {
  const styledElement = createElement('div');
  styledElement.style.color = 'red';
  const styleResult = styleState.applyStudioStyleMutationWithTransaction(
    [styledElement],
    'color',
    '#fff',
    {
      createStyleTransaction: transactionState.createStudioStyleTransaction,
      getElementId: () => 'node-style'
    }
  );

  assert.equal(styleResult.didApply, true);
  assert.equal(styleResult.transaction.operations[0].elementId, 'node-style');
  assert.deepEqual(styleResult.transaction.operations[0].before, { color: 'red' });
  assert.deepEqual(styleResult.transaction.operations[0].after, { color: '#fff' });

  const textElement = createElement('div');
  textElement.textContent = 'Before';
  const propertyResult = styleState.applyStudioStyleMutationWithTransaction(
    [textElement],
    'text',
    'After',
    {
      createPropertyTransaction: transactionState.createStudioPropertyTransaction,
      getElementId: () => 'node-text'
    }
  );

  assert.equal(propertyResult.didApply, true);
  assert.deepEqual(propertyResult.transaction.operations[0], {
    type: 'property',
    elementId: 'node-text',
    property: 'textContent',
    before: 'Before',
    after: 'After'
  });
});

test('applyStudioStyleMutationWithTransaction accepts an injected mutation primitive', () => {
  const element = createElement();
  const calls = [];
  const result = styleState.applyStudioStyleMutationWithTransaction([element], 'color', '#fff', {
    applyStudioStyleMutation(selection, prop, value) {
      calls.push([selection, prop, value]);
      return { didApply: true, displayValue: value };
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.displayValue, '#fff');
  assert.deepEqual(calls, [[[element], 'color', '#fff']]);
});

test('applyStudioStyleMutationWithTransaction restores styles when an adapter rejects after mutating', () => {
  const first = createElement();
  const second = createElement();
  first.style.color = 'red';
  second.style.color = 'blue';

  const result = styleState.applyStudioStyleMutationWithTransaction(
    [first, second],
    'color',
    '#fff',
    {
      applyStudioStyleMutation(selection) {
        selection.forEach((element) => {
          element.style.color = '#fff';
        });
        return { didApply: false, displayValue: '#fff' };
      }
    }
  );

  assert.deepEqual(result, {
    didApply: false,
    displayValue: '#fff',
    transaction: null
  });
  assert.equal(first.style.color, 'red');
  assert.equal(second.style.color, 'blue');
});

test('applyStudioStyleMutationWithTransaction restores text when an adapter throws', () => {
  const element = createElement();
  element.textContent = 'Before';

  const result = styleState.applyStudioStyleMutationWithTransaction(
    [element],
    'text',
    'After',
    {
      applyStudioStyleMutation(targets) {
        targets[0].textContent = 'After';
        throw new Error('mutation failed');
      }
    }
  );

  assert.deepEqual(result, {
    didApply: false,
    displayValue: 'After',
    transaction: null
  });
  assert.equal(element.textContent, 'Before');
});
