const test = require('node:test');
const assert = require('node:assert/strict');

const bridgeApi = require('../shared/studio-editor-navigation-ui-bridge.js');

test('navigation UI bridge forwards navigation lifecycle and slide commands', () => {
  const calls = [];
  const navigationSync = {
    sync(...args) { calls.push(['sync', ...args]); return 'sync-result'; },
    bind(...args) { calls.push(['bind', ...args]); return 'bind-result'; },
    teardown(...args) { calls.push(['teardown', ...args]); return 'teardown-result'; },
    schedule(...args) { calls.push(['schedule', ...args]); return 'schedule-result'; },
    observe(...args) { calls.push(['observe', ...args]); return 'observe-result'; },
    setActiveSlide(...args) { calls.push(['setActiveSlide', ...args]); return 'active-result'; },
    navigate(...args) { calls.push(['navigate', ...args]); return 'navigate-result'; },
    updateIframeNavigationUi(...args) {
      calls.push(['updateIframeNavigationUi', ...args]);
      return 'iframe-result';
    }
  };
  const bridge = bridgeApi.createStudioEditorNavigationUiBridge({ navigationSync });
  const sourceDocument = { id: 'source-document' };
  const slides = [{ id: 'slide-1' }];

  assert.equal(bridge.syncStudioChromeToActiveSlide(sourceDocument, { preserveSelection: true }), 'sync-result');
  assert.equal(bridge.bindDeckNavigationSync(sourceDocument), 'bind-result');
  assert.equal(bridge.teardownDeckActiveSlideSync(), 'teardown-result');
  assert.equal(bridge.scheduleStudioChromeSync(sourceDocument), 'schedule-result');
  assert.equal(bridge.observeDeckActiveSlideState(sourceDocument), 'observe-result');
  assert.equal(bridge.setActiveSlide(2, { captureHistory: true }), 'active-result');
  assert.equal(bridge.navigateEditorSlide(-1), 'navigate-result');
  assert.equal(bridge.updateIframeNavigationUI(sourceDocument, slides), 'iframe-result');
  assert.deepEqual(calls, [
    ['sync', sourceDocument, { preserveSelection: true }],
    ['bind', sourceDocument],
    ['teardown'],
    ['schedule', sourceDocument],
    ['observe', sourceDocument],
    ['setActiveSlide', 2, { captureHistory: true }],
    ['navigate', -1],
    ['updateIframeNavigationUi', sourceDocument, slides]
  ]);
});

test('navigation UI bridge forwards active thumbnail synchronization', () => {
  const calls = [];
  const bridge = bridgeApi.createStudioEditorNavigationUiBridge({
    thumbnailController: {
      syncActiveSlideCard(slideId) {
        calls.push(slideId);
        return true;
      }
    }
  });

  assert.equal(bridge.updateActiveThumbnailCardState('slide-2'), true);
  assert.deepEqual(calls, ['slide-2']);
});

test('navigation UI bridge fails closed when a shared controller throws or is absent', () => {
  const bridge = bridgeApi.createStudioEditorNavigationUiBridge({
    navigationSync: {
      sync() {
        throw new Error('navigation failure');
      }
    }
  });

  assert.equal(bridge.syncStudioChromeToActiveSlide({}), false);
  assert.equal(bridge.updateActiveThumbnailCardState('slide-1'), false);
});
