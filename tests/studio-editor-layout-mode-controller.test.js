const test = require('node:test');
const assert = require('node:assert/strict');

const controllerApi = require('../shared/studio-editor-layout-mode-controller.js');

test('layout mode controller resolves the active canonical mode and delegates label rendering', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const sourceDoc = { id: 'iframe-document' };
  const layoutModeApi = {
    resolveStudioCanonicalLayoutMode(deck, slideId, options) {
      calls.push(['resolve', deck, slideId, options]);
      return 'flow';
    }
  };
  const controller = controllerApi.createStudioEditorLayoutModeController({
    layoutModeApi,
    layoutModeViewApi: {
      syncStudioEditorLayoutModeLabel(options) {
        calls.push(['render', options]);
        return true;
      }
    },
    documentRef,
    resolveCanonicalDeck(doc) {
      calls.push(['deck', doc]);
      return { slides: [] };
    },
    resolveActiveSlideId(doc) {
      calls.push(['slide', doc]);
      return 'slide-2';
    }
  });

  assert.equal(controller.sync(sourceDoc), true);
  assert.deepEqual(calls, [
    ['deck', sourceDoc],
    ['slide', sourceDoc],
    ['resolve', { slides: [] }, 'slide-2', { fallbackMode: '' }],
    ['render', { documentRef, layoutModeApi, mode: 'flow' }]
  ]);
});

test('layout mode controller preserves unavailable-state fallback when canonical resolution fails', () => {
  let renderedMode = null;
  const controller = controllerApi.createStudioEditorLayoutModeController({
    layoutModeApi: {
      resolveStudioCanonicalLayoutMode(deck, slideId, options) {
        assert.equal(deck, null);
        assert.equal(slideId, '');
        assert.deepEqual(options, { fallbackMode: '' });
        return 'flow';
      }
    },
    layoutModeViewApi: {
      syncStudioEditorLayoutModeLabel(options) {
        renderedMode = options.mode;
        return true;
      }
    },
    resolveCanonicalDeck() {
      throw new Error('canonical state unavailable');
    }
  });

  assert.equal(controller.sync({ id: 'iframe-document' }), true);
  assert.equal(renderedMode, 'flow');
});

test('layout mode controller fails closed when required dependencies are unavailable', () => {
  const controller = controllerApi.createStudioEditorLayoutModeController({});

  assert.equal(controller.sync(), false);
});
