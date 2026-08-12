const test = require('node:test');
const assert = require('node:assert/strict');

const frameInteractions = require('../shared/studio-editor-frame-interactions.js');

test('attaches frame click, keyboard, and inline-edit handlers with editor callbacks', () => {
  const calls = [];
  const doc = { activeElement: { id: 'active' } };
  let selectedDocument = null;
  let resolvedTextElementArgs = null;
  const resolveAdjacentTextElement = () => 'next-cell';
  const resolveTextElement = (...args) => {
    resolvedTextElementArgs = args;
    return 'text-element';
  };
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
    resolveTextElement,
    getSelectedElements: (currentDoc) => {
      selectedDocument = currentDoc;
      return ['element-1'];
    },
    resolveAdjacentTextElement,
    canMutateDeck: () => true,
    navigateSlide: () => 'navigated'
  });

  assert.equal(controller.attach(doc), true);
  assert.equal(calls.map(([name]) => name).join(','), 'click,inline,keydown,attach');
  assert.equal(calls[3][2].clickHandler, 'click-handler');
  assert.equal(calls[3][2].keydownHandler, 'keydown-handler');
  assert.deepEqual(calls[1][2].getActiveSlide(), { id: 'slide-1' });
  assert.equal(calls[1][2].resolveTextElement('node', 'slide'), 'text-element');
  assert.deepEqual(resolvedTextElementArgs, ['node', 'slide', doc]);
  assert.equal(calls[1][2].resolveAdjacentTextElement, resolveAdjacentTextElement);
  assert.deepEqual(calls[2][1].getSelectedElements(), ['element-1']);
  assert.equal(selectedDocument, doc);
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

test('inline edit eligibility prefers canonical lock and hidden state', () => {
  const doc = { activeElement: null };
  let canEdit = null;
  const state = { locked: false, hidden: false };
  const controller = frameInteractions.createStudioEditorFrameInteractions({
    eventsApi: {
      createStudioFrameClickHandler: () => () => {},
      createStudioFrameKeydownHandler: () => () => {},
      attachStudioFrameInteractionHandlers() {}
    },
    inlineTextEditApi: {
      attachStudioInlineTextEditHandlers(nextDoc, options) {
        assert.equal(nextDoc, doc);
        canEdit = options.canEdit;
      }
    },
    getActiveSlide: () => ({ id: 'slide-1' }),
    getCanonicalVisibilityReader(property, currentDoc) {
      assert.equal(currentDoc, doc);
      return () => state[property];
    },
    isElementLocked: () => false,
    isElementHidden: () => false
  });

  assert.equal(controller.attach(doc), true);
  assert.equal(canEdit({ id: 'node-1' }), true);
  state.locked = true;
  assert.equal(canEdit({ id: 'node-1' }), false);
  state.locked = false;
  state.hidden = true;
  assert.equal(canEdit({ id: 'node-1' }), false);
});
