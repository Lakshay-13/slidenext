const test = require('node:test');
const assert = require('node:assert/strict');
const bridgeApi = require('../shared/studio-editor-session-bridge-controller.js');

test('session bridge delegates readers, updates, frame guards, and snapshots to the session controller', () => {
  const calls = [];
  const readers = {
    getCurrentPresentationUrl: () => '/deck/index.html',
    getCurrentSessionToken: () => 4
  };
  const frameLoadHandler = () => true;
  const sessionStateController = {
    readers() {
      calls.push(['readers']);
      return readers;
    },
    readerOptions(options) {
      calls.push(['readerOptions', options]);
      return { ...readers, ...options };
    },
    capture() {
      calls.push(['capture']);
      return { presentationUrl: '/deck/index.html', sessionToken: 4 };
    },
    update(nextState) {
      calls.push(['update', nextState]);
      return nextState;
    },
    createFrameLoadHandler(options) {
      calls.push(['frameLoadHandler', options]);
      return frameLoadHandler;
    },
    shouldHandleFrameLoad(url, options) {
      calls.push(['frameLoadGuard', url, options]);
      return true;
    }
  };
  const bridge = bridgeApi.createStudioEditorSessionBridgeController({ sessionStateController });

  assert.equal(bridge.createReaders(), readers);
  assert.deepEqual(bridge.createReaderOptions({ sessionToken: 4 }), {
    ...readers,
    sessionToken: 4
  });
  assert.deepEqual(bridge.capture(), { presentationUrl: '/deck/index.html', sessionToken: 4 });
  assert.deepEqual(bridge.update({ slideIndex: 2 }), { slideIndex: 2 });
  assert.equal(bridge.createFrameLoadHandler({ presentationUrl: '/deck/index.html' }), frameLoadHandler);
  assert.equal(bridge.shouldHandleFrameLoad('/deck/index.html', { sessionToken: 4 }), true);
  assert.deepEqual(calls, [
    ['readers'],
    ['readerOptions', { sessionToken: 4 }],
    ['capture'],
    ['update', { slideIndex: 2 }],
    ['frameLoadHandler', { presentationUrl: '/deck/index.html' }],
    ['frameLoadGuard', '/deck/index.html', { sessionToken: 4 }]
  ]);
});

test('session bridge preserves neutral reader fallbacks and live snapshot fallbacks', () => {
  const bridge = bridgeApi.createStudioEditorSessionBridgeController({
    sessionApi: null,
    getPresentationUrl: () => '/fallback/index.html',
    getSessionToken: () => 8
  });

  const readers = bridge.createReaders();
  assert.equal(readers.getCurrentPresentationUrl(), '');
  assert.equal(readers.getCurrentSessionToken(), 0);
  const readerOptions = bridge.createReaderOptions({ mode: 'fallback' });
  assert.equal(typeof readerOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof readerOptions.getCurrentSessionToken, 'function');
  assert.equal(readerOptions.mode, 'fallback');
  assert.deepEqual(bridge.capture(), {
    presentationUrl: '/fallback/index.html',
    sessionToken: 8
  });
  assert.equal(bridge.createFrameLoadHandler()(), false);
  assert.equal(bridge.shouldHandleFrameLoad('/fallback/index.html'), false);
});
