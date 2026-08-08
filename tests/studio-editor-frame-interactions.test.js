const test = require('node:test');
const assert = require('node:assert/strict');

const frameInteractions = require('../shared/studio-editor-frame-interactions.js');

test('attaches frame click, keyboard, and inline-edit handlers with editor callbacks', () => {
  const calls = [];
  const doc = { activeElement: { id: 'active' } };
  const resolveAdjacentTextElement = () => 'next-cell';
  const controller = frameInteractions.createStudioEditorFrameInteractions({
    eventsApi: {
      createStudioFrameClickHandler(options) {
        calls.push(['click', options]);
        return 'click-handler';
      },
      createStudioFrameKeydownHandler(options) {
        calls.push(['keydown', options]);
        return 'keydown-handler';
      },
      attachStudioFrameInteractionHandlers(nextDoc, options) {
        calls.push(['attach', nextDoc, options]);
      }
    },
    inlineTextEditApi: {
      attachStudioInlineTextEditHandlers(nextDoc, options) {
        calls.push(['inline', nextDoc, options]);
      }
    },
    getActiveSlide: () => ({ id: 'slide-1' }),
    getSelectedElements: () => ['element-1'],
    resolveAdjacentTextElement,
    canMutateDeck: () => true,
    navigateSlide: () => 'navigated'
  });

  assert.equal(controller.attach(doc), true);
  assert.equal(calls.map(([name]) => name).join(','), 'click,inline,keydown,attach');
  assert.equal(calls[3][2].clickHandler, 'click-handler');
  assert.equal(calls[3][2].keydownHandler, 'keydown-handler');
  assert.deepEqual(calls[1][2].getActiveSlide(), { id: 'slide-1' });
  assert.equal(calls[1][2].resolveAdjacentTextElement, resolveAdjacentTextElement);
  assert.deepEqual(calls[2][1].getSelectedElements(), ['element-1']);
  assert.equal(calls[2][1].canMutateDeck(), true);
  assert.equal(calls[2][1].navigateSlide(), 'navigated');
});

test('fails closed when the frame document or event handler factory is unavailable', () => {
  const noDocumentController = frameInteractions.createStudioEditorFrameInteractions({
    eventsApi: {}
  });
  const noEventsController = frameInteractions.createStudioEditorFrameInteractions();

  assert.equal(noDocumentController.attach(null), false);
  assert.equal(noEventsController.attach({}), false);
});
