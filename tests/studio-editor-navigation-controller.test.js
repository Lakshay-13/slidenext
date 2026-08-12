const test = require('node:test');
const assert = require('node:assert/strict');
const navigationController = require('../shared/studio-editor-navigation-controller.js');

function createController(overrides = {}) {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const windowRef = { id: 'iframe-window' };
  const slides = [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }];
  const deckViewApi = {
    setStudioDeckActiveSlide(index, options) {
      calls.push(['set', index, options]);
      return true;
    },
    bindStudioDeckNavigationSync(doc, frameWindow, options) {
      calls.push(['bind', doc, frameWindow, options]);
      return true;
    },
    updateStudioDeckNavigationUi(doc, nextSlides, currentIndex, options) {
      calls.push(['update', doc, nextSlides, currentIndex, options]);
      return true;
    }
  };
  const controller = navigationController.createStudioEditorNavigationController({
    deckViewApi,
    getDocument: () => documentRef,
    getWindow: () => windowRef,
    getSlides: () => slides,
    getCurrentSlideIndex: () => 1,
    syncStudioChromeToActiveSlide() {},
    ...overrides
  });
  return { calls, controller, documentRef, windowRef, slides };
}

test('navigation controller forwards active-slide changes and frame sync', () => {
  const { calls, controller, documentRef, windowRef, slides } = createController();

  assert.equal(controller.setActiveSlide(2, {
    captureHistory: true,
    preserveSelection: true
  }), true);
  assert.equal(controller.navigate(-1), true);
  assert.equal(controller.bind(), true);
  assert.equal(controller.updateIframeNavigationUi(documentRef, slides), true);

  assert.equal(calls[0][0], 'set');
  assert.equal(calls[0][1], 2);
  assert.equal(calls[0][2].doc, documentRef);
  assert.equal(calls[0][2].captureHistory, true);
  assert.equal(calls[0][2].preserveSelection, true);
  assert.equal(calls[0][2].getCurrentSlideIndex(), 1);
  assert.equal(calls[1][1], 0);
  assert.equal(calls[1][2].captureHistory, true);
  assert.equal(calls[2][1], documentRef);
  assert.equal(calls[2][2], windowRef);
  assert.equal(calls[2][3].getSyncStudioChromeOptions().captureHistory, true);
  assert.equal(calls[3][1], documentRef);
  assert.equal(calls[3][2], slides);
  assert.equal(calls[3][3], 1);
  assert.equal(calls[3][4].setActiveSlide(2), true);
});

test('navigation controller clamps directional movement and rejects invalid requests', () => {
  const calls = [];
  let currentIndex = 1;
  const slides = [{}, {}, {}];
  const controller = navigationController.createStudioEditorNavigationController({
    getSlides: () => slides,
    getCurrentSlideIndex: () => currentIndex,
    setActiveSlide() {},
    deckViewApi: {
      setStudioDeckActiveSlide(index) {
        calls.push(index);
        currentIndex = index;
        return true;
      }
    }
  });

  assert.equal(controller.navigate(-1), true);
  assert.equal(controller.navigate(1), true);
  assert.equal(controller.navigate(1), true);
  assert.equal(controller.navigate(1), false);
  assert.equal(controller.navigate(0), false);
  assert.equal(controller.navigate(Number.NaN), false);
  assert.deepEqual(calls, [0, 1, 2]);
});

test('navigation controller fails closed when deck view methods are unavailable', () => {
  const controller = navigationController.createStudioEditorNavigationController({
    deckViewApi: null
  });

  assert.equal(controller.setActiveSlide(0), false);
  assert.equal(controller.navigate(1), false);
  assert.equal(controller.bind(), false);
  assert.equal(controller.updateIframeNavigationUi(null, []), false);
});
