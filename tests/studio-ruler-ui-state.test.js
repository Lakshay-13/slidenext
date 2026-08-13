const test = require('node:test');
const assert = require('node:assert/strict');
const zoomController = require('../shared/studio-editor-zoom-controller.js');
const zoomAccessorsApi = require('../shared/studio-editor-zoom-accessors.js');

function createRulerContainer(ownerDocument) {
  return {
    ownerDocument,
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
}

test('syncCanvasRulers renders zoomed ticks against the visible canvas wrapper offset', () => {
  const ownerDocument = {
    createElement() {
      return {
        className: '',
        textContent: '',
        style: {}
      };
    }
  };
  const horizontal = createRulerContainer(ownerDocument);
  const vertical = createRulerContainer(ownerDocument);
  const stage = {
    getBoundingClientRect() {
      return { left: 100, top: 200 };
    }
  };
  const wrapper = {
    getBoundingClientRect() {
      return { left: 80, top: 180 };
    }
  };
  const nodes = new Map([
    ['canvasStage', stage],
    ['canvasWrapper', wrapper],
    ['canvasRulerHorizontal', horizontal],
    ['canvasRulerVertical', vertical]
  ]);
  const context = {
    document: {
      getElementById(id) {
        return nodes.get(id) || null;
      }
    },
    zoomFactor: 0.5,
    SlideNextStudioEditorRulerView: require('../shared/studio-editor-ruler-view.js')
  };
  context.studioEditorZoomController = zoomController.createStudioEditorZoomController({
    rulerViewApi: context.SlideNextStudioEditorRulerView,
    documentRef: context.document,
    getZoomFactor: () => context.zoomFactor
  });
  const globalApi = zoomAccessorsApi.createStudioEditorZoomGlobalApi({
    accessors: zoomAccessorsApi.createStudioEditorZoomAccessors({
      zoomController: context.studioEditorZoomController
    })
  });

  assert.equal(globalApi.syncCanvasRulers(), true);
  assert.equal(horizontal.children[0].style.left, '-20px');
  assert.equal(horizontal.children[1].textContent, '0');
  assert.equal(horizontal.children[2].style.left, '-10px');
  assert.equal(vertical.children[0].style.top, '-20px');
  assert.equal(vertical.children[1].textContent, '0');
  assert.equal(vertical.children[2].style.top, '-10px');
});

test('syncCanvasRulers delegates ruler rendering to the shared coordinator', () => {
  const calls = [];
  const context = {
    document: {},
    zoomFactor: 0.75,
    SlideNextStudioEditorRulerView: {
      syncStudioCanvasRulers(options) {
        calls.push(options);
        return 'delegated';
      }
    }
  };
  context.studioEditorZoomController = zoomController.createStudioEditorZoomController({
    rulerViewApi: context.SlideNextStudioEditorRulerView,
    documentRef: context.document,
    getZoomFactor: () => context.zoomFactor
  });

  const globalApi = zoomAccessorsApi.createStudioEditorZoomGlobalApi({
    accessors: zoomAccessorsApi.createStudioEditorZoomAccessors({
      zoomController: context.studioEditorZoomController
    })
  });

  assert.equal(globalApi.syncCanvasRulers(), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].zoomFactor, 0.75);
});
