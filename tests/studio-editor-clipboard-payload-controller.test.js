const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const payloadController = require('../shared/studio-editor-clipboard-payload-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard payload controller delegates ordered DOM payload construction', () => {
  const first = { id: 'first' };
  const second = { id: 'second' };
  const ordered = [second, first];
  const documentRef = {
    defaultView: {
      getComputedStyle() {
        return { position: 'relative' };
      }
    }
  };
  const slide = { id: 'slide-1' };
  const metrics = { logicalWidth: 1280, logicalHeight: 720 };
  const calls = [];
  const sanitizeElement = () => {};
  const getClosestPositionedAncestor = () => null;
  const buildPositionedLayoutItem = () => null;
  const controller = payloadController.createStudioEditorClipboardPayloadController({
    clipboardApi: {
      getStudioClipboardSelection(elements, options) {
        calls.push(['selection', elements, options.orderedElements]);
        return ordered;
      },
      buildStudioClipboardPayloadItems(elements, options) {
        calls.push(['payload', elements, options]);
        return [{ id: 'payload' }];
      }
    },
    getActiveSlide: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return slide;
    },
    getSlideMetrics: (currentSlide) => {
      assert.equal(currentSlide, slide);
      return metrics;
    },
    getNormalizedSlideLayerOrder: (currentSlide) => {
      assert.equal(currentSlide, slide);
      return ordered;
    },
    sanitizeElement,
    getRectOnSlide: () => ({ left: 0, top: 0 }),
    getClosestPositionedAncestor,
    buildPositionedLayoutItem
  });

  assert.deepEqual(controller.buildPayload([first, second], documentRef), [{ id: 'payload' }]);
  assert.deepEqual(calls[0], ['selection', [first, second], ordered]);
  assert.equal(calls[1][0], 'payload');
  assert.deepEqual(calls[1][1], ordered);
  assert.equal(calls[1][2].sanitizeElement, sanitizeElement);
  assert.equal(calls[1][2].getClosestPositionedAncestor, getClosestPositionedAncestor);
  assert.equal(calls[1][2].buildPositionedLayoutItem, buildPositionedLayoutItem);
  assert.deepEqual(calls[1][2].positionedLayoutOptions.slideMetrics, metrics);
});

test('clipboard payload controller fails closed without payload dependencies', () => {
  const controller = payloadController.createStudioEditorClipboardPayloadController({
    getActiveSlide: () => ({ id: 'slide-1' }),
    getIframeDoc: () => ({
      defaultView: {
        getComputedStyle() {
          return {};
        }
      }
    })
  });

  assert.deepEqual(controller.buildPayload([{ id: 'element' }]), []);
});

test('editor routes clipboard payload construction through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /SlideNextStudioEditorClipboardPayloadController/);
  assert.match(source, /studioEditorClipboardPayloadController\.buildPayload\(elements, doc\)/);
});
