const test = require('node:test');
const assert = require('node:assert/strict');

const interactions = require('../shared/studio-editor-interactions.js');

test('attachStudioEditorInteractionHandlers binds transform and marquee pointer lifecycles', () => {
  const bodyListeners = new Map();
  const windowListeners = new Map();
  const doc = {
    addEventListener(type, handler, capture) {
      bodyListeners.set(`document:${type}`, { handler, capture });
    },
    body: {
      addEventListener(type, handler, capture) {
        const handlers = bodyListeners.get(type) || [];
        handlers.push({ handler, capture });
        bodyListeners.set(type, handlers);
      }
    },
    defaultView: {
      addEventListener(type, handler, capture) {
        windowListeners.set(type, { handler, capture });
      }
    }
  };

  assert.equal(interactions.attachStudioEditorInteractionHandlers(doc, {
    transformOptions: {
      getActiveSlide: () => ({ contains: () => true }),
      getSelectionState: () => ({ selection: [], canTransform: false })
    },
    marqueeOptions: {
      getActiveSlide: () => ({ contains: () => true })
    }
  }), true);

  assert.equal(bodyListeners.get('pointerdown').length, 2);
  assert.equal(bodyListeners.get('pointermove').length, 2);
  assert.equal(bodyListeners.get('pointerup').length, 2);
  assert.equal(bodyListeners.get('pointercancel').length, 2);
  assert.equal(bodyListeners.get('document:dragstart').capture, true);
  assert.equal(windowListeners.get('blur').capture, true);
});

test('attachStudioEditorInteractionHandlers tolerates missing documents and shared factories', () => {
  assert.equal(interactions.attachStudioEditorInteractionHandlers(null), false);
  assert.equal(interactions.attachStudioEditorInteractionHandlers({ body: {} }), false);
});
