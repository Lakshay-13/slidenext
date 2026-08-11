const test = require('node:test');
const assert = require('node:assert/strict');

const conversion = require('../shared/studio-editor-layout-conversion.js');

test('buildStudioFlowToFreeformPlan creates slide-space absolute layout and reversible style patches', () => {
  const element = {
    isConnected: true,
    style: {
      position: '',
      margin: '12px',
      left: '',
      top: '',
      width: '80%',
      height: ''
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return { boxSizing: 'border-box' };
        }
      }
    }
  };
  const parent = {};

  assert.deepEqual(conversion.buildStudioFlowToFreeformPlan([element], {
    isLocked: () => false,
    isFreeformPositioned: () => false,
    getClosestPositionedAncestor: () => parent,
    getRectOnSlide: (rect) => rect,
    buildPositionedLayoutItems: () => [{
      element,
      absLeft: 140,
      absTop: 90,
      width: 320,
      height: 72,
      parentLeft: 40,
      parentTop: 30
    }]
  }), {
    selection: [element],
    canConvert: true,
    reason: '',
    items: [{
      element,
      beforeStyle: {
        position: '',
        margin: '12px',
        left: '',
        top: '',
        width: '80%',
        height: ''
      },
      afterStyle: {
        position: 'absolute',
        margin: '0px',
        left: '100px',
        top: '60px',
        width: '320px',
        height: '72px'
      },
      layout: {
        mode: 'absolute',
        x: 140,
        y: 90,
        width: 320,
        height: 72
      }
    }]
  });
});

test('buildStudioFlowToFreeformPlan rejects locked and already-freeform selections without geometry work', () => {
  const element = { isConnected: true };
  let geometryCalls = 0;
  const options = {
    isLocked: () => true,
    isFreeformPositioned: () => false,
    buildPositionedLayoutItems: () => {
      geometryCalls += 1;
      return [];
    }
  };

  assert.deepEqual(conversion.buildStudioFlowToFreeformPlan([element], options), {
    selection: [element],
    items: [],
    canConvert: false,
    reason: 'locked-selection'
  });

  assert.deepEqual(conversion.buildStudioFlowToFreeformPlan([element], {
    ...options,
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), {
    selection: [element],
    items: [],
    canConvert: false,
    reason: 'already-freeform'
  });
  assert.equal(geometryCalls, 0);
});

test('buildStudioFlowToFreeformPlan preserves content-box dimensions when computed padding and borders exist', () => {
  const element = {
    isConnected: true,
    style: {},
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            boxSizing: 'content-box',
            paddingLeft: '10px',
            paddingRight: '14px',
            paddingTop: '4px',
            paddingBottom: '6px',
            borderLeftWidth: '2px',
            borderRightWidth: '3px',
            borderTopWidth: '1px',
            borderBottomWidth: '2px'
          };
        }
      }
    }
  };

  const plan = conversion.buildStudioFlowToFreeformPlan([element], {
    isLocked: () => false,
    isFreeformPositioned: () => false,
    buildPositionedLayoutItems: () => [{
      element,
      absLeft: 0,
      absTop: 0,
      width: 200,
      height: 100,
      parentLeft: 0,
      parentTop: 0
    }]
  });

  assert.equal(plan.canConvert, true);
  assert.equal(plan.items[0].afterStyle.width, '171px');
  assert.equal(plan.items[0].afterStyle.height, '87px');
});

test('buildStudioFlowToFreeformPlan fails closed when rendered geometry is incomplete', () => {
  const element = { isConnected: true };

  assert.deepEqual(conversion.buildStudioFlowToFreeformPlan([element], {
    isLocked: () => false,
    isFreeformPositioned: () => false,
    buildPositionedLayoutItems: () => [{
      element,
      absLeft: 10,
      absTop: 20,
      width: null,
      height: 40,
      parentLeft: 0,
      parentTop: 0
    }]
  }), {
    selection: [element],
    items: [],
    canConvert: false,
    reason: 'geometry-unavailable'
  });
});

test('getStudioConversionSelection removes stale and hidden elements', () => {
  const stale = { isConnected: false };
  const hidden = { isConnected: true };
  const visible = { isConnected: true };

  assert.deepEqual(conversion.getStudioConversionSelection([stale, hidden, visible], {
    isHidden: (element) => element === hidden
  }), [visible]);
});
