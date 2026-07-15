const test = require('node:test');
const assert = require('node:assert/strict');

const styleState = require('../shared/studio-editor-style.js');

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
