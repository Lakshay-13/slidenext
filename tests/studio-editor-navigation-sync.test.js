const test = require('node:test');
const assert = require('node:assert/strict');

const navigationSync = require('../shared/studio-editor-navigation-sync.js');

test('navigation sync coordinates active-slide refresh and auxiliary action state', () => {
  const calls = [];
  const doc = { id: 'frame' };
  const controller = navigationSync.createStudioEditorNavigationSync({
    activeSlideController: {
      sync(nextDoc, options) {
        calls.push(['sync', nextDoc, options]);
        return true;
      }
    },
    getDocument: () => doc,
    syncLayoutModeControl: (nextDoc) => calls.push(['layout', nextDoc]),
    updateTemplateActionState: (nextDoc) => calls.push(['template', nextDoc]),
    updateMasterSlideActionState: (nextDoc) => calls.push(['master', nextDoc]),
    updateAssetLibraryState: (nextDoc) => calls.push(['assets', nextDoc])
  });

  assert.equal(controller.sync(undefined, { preserveSelection: true }), true);
  assert.deepEqual(calls, [
    ['sync', doc, { preserveSelection: true }],
    ['layout', doc],
    ['template', doc],
    ['master', doc],
    ['assets', doc]
  ]);
});

test('navigation sync continues auxiliary refreshes when one panel throws', () => {
  const calls = [];
  const controller = navigationSync.createStudioEditorNavigationSync({
    activeSlideController: {
      sync() {
        calls.push('sync');
        return true;
      }
    },
    syncLayoutModeControl() {
      throw new Error('layout refresh failed');
    },
    updateTemplateActionState() {
      calls.push('template');
    },
    updateMasterSlideActionState() {
      calls.push('master');
    },
    updateAssetLibraryState() {
      calls.push('assets');
    }
  });

  assert.doesNotThrow(() => {
    assert.equal(controller.sync(), true);
  });
  assert.deepEqual(calls, ['sync', 'template', 'master', 'assets']);
});

test('navigation sync delegates slide navigation methods and fails closed without controllers', () => {
  const calls = [];
  const iframeDoc = { id: 'frame' };
  const navigationController = {
    bind(doc) {
      calls.push(['bind', doc]);
      return true;
    },
    setActiveSlide(index, options) {
      calls.push(['set', index, options]);
      return true;
    },
    navigate(direction) {
      calls.push(['navigate', direction]);
      return true;
    },
    updateIframeNavigationUi(doc, slides) {
      calls.push(['ui', doc, slides]);
      return true;
    }
  };
  const controller = navigationSync.createStudioEditorNavigationSync({
    navigationController,
    getDocument: () => iframeDoc
  });
  const slides = [{ id: 'slide-1' }];

  assert.equal(controller.bind(), true);
  assert.equal(controller.setActiveSlide(2, { captureHistory: true }), true);
  assert.equal(controller.navigate(1), true);
  assert.equal(controller.updateIframeNavigationUi(iframeDoc, slides), true);
  assert.deepEqual(calls, [
    ['bind', iframeDoc],
    ['set', 2, { captureHistory: true }],
    ['navigate', 1],
    ['ui', iframeDoc, slides]
  ]);

  const emptyController = navigationSync.createStudioEditorNavigationSync();
  assert.equal(emptyController.bind(), false);
  assert.equal(emptyController.setActiveSlide(0), false);
  assert.equal(emptyController.navigate(1), false);
  assert.equal(emptyController.updateIframeNavigationUi(null, []), false);
});

test('navigation sync owns observer and debounced timer lifecycle', () => {
  const calls = [];
  let scheduledCallback = null;
  const observer = { id: 'observer' };
  const deckViewApi = {
    teardownStudioDeckActiveSlideSync(state) {
      calls.push(['teardown', state]);
      return { observer: null, timer: null };
    },
    scheduleStudioDeckActiveSlideSync(currentTimer, callback) {
      calls.push(['schedule', currentTimer]);
      scheduledCallback = callback;
      return 7;
    },
    observeStudioDeckActiveSlideState(doc, options) {
      calls.push(['observe', doc]);
      options.scheduleSync(doc);
      return { didObserve: true, observer };
    }
  };
  const controller = navigationSync.createStudioEditorNavigationSync({
    deckViewApi,
    activeSlideController: {
      sync(doc) {
        calls.push(['sync', doc]);
        return true;
      }
    }
  });

  assert.equal(controller.observe({ id: 'frame' }), true);
  assert.deepEqual(controller.getSyncState(), { observer, syncTimer: 7 });
  assert.equal(typeof scheduledCallback, 'function');
  scheduledCallback();
  assert.deepEqual(controller.getSyncState(), { observer, syncTimer: null });
  assert.equal(controller.teardown(), true);
  assert.deepEqual(calls.map(([name]) => name), [
    'teardown',
    'observe',
    'schedule',
    'sync',
    'teardown'
  ]);
});
