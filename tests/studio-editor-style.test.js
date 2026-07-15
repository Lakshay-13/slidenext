const test = require('node:test');
const assert = require('node:assert/strict');

const styleState = require('../shared/studio-editor-style.js');
const transactionState = require('../shared/studio-editor-transaction.js');

function createElement(tagName = 'div') {
  return {
    isConnected: true,
    tagName,
    style: {},
    textContent: '',
    src: ''
  };
}

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
