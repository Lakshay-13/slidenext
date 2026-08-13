const test = require('node:test');
const assert = require('node:assert/strict');
const routingController = require('../shared/studio-editor-slide-routing-controller.js');

test('slide routing controller resolves IDs before delegating selection, deletion, and reorder', () => {
  const calls = [];
  const controller = routingController.createStudioEditorSlideRoutingController({
    deckViewApi: {
      setStudioDeckActiveSlideById(slideId, options) {
        calls.push(['select', slideId, options]);
        options.activateSlideByIndex(2);
        return true;
      }
    },
    getSlideIndexById: (slideId) => ({
      'slide-1': 0,
      'slide-2': 1,
      'slide-3': 2
    }[slideId] ?? -1),
    activateSlideByIndex: (index, options) => calls.push(['activate', index, options]),
    deleteSlideByIndex: (index) => {
      calls.push(['delete', index]);
      return true;
    },
    reorderSlidesByIndex: (fromIdx, toIdx) => {
      calls.push(['reorder', fromIdx, toIdx]);
      return true;
    }
  });

  assert.equal(controller.select('slide-3', { id: 'doc' }, { captureHistory: true }), true);
  assert.equal(controller.remove('slide-2', { id: 'doc' }), true);
  assert.equal(controller.reorder('slide-1', 'slide-3', { id: 'doc' }), true);
  assert.equal(controller.remove('missing', { id: 'doc' }), false);
  assert.deepEqual(calls, [
    ['select', 'slide-3', {
      doc: { id: 'doc' },
      getSlideIndexById: calls[0][2].getSlideIndexById,
      activateSlideByIndex: calls[0][2].activateSlideByIndex
    }],
    ['activate', 2, { captureHistory: true }],
    ['delete', 1],
    ['reorder', 0, 2]
  ]);
});

test('slide routing controller fails closed when route dependencies are unavailable', () => {
  const controller = routingController.createStudioEditorSlideRoutingController({});

  assert.equal(controller.select('slide-1', {}), false);
  assert.equal(controller.remove('slide-1', {}), false);
  assert.equal(controller.reorder('slide-1', 'slide-2', {}), false);
});

test('slide routing controller reports activation failures instead of a false success', () => {
  const controller = routingController.createStudioEditorSlideRoutingController({
    deckViewApi: {
      setStudioDeckActiveSlideById(_slideId, options) {
        options.activateSlideByIndex(1);
        return true;
      }
    },
    getSlideIndexById: () => 1,
    activateSlideByIndex: () => false
  });

  assert.equal(controller.select('slide-2', {}), false);
});
