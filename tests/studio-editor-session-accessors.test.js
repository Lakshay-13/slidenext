const test = require('node:test');
const assert = require('node:assert/strict');

const sessionAccessors = require('../shared/studio-editor-session-accessors.js');

test('session accessors delegate live readers and frame state through the bridge', () => {
  const calls = [];
  const bridge = {
    createReaders() {
      calls.push('readers');
      return { getCurrentPresentationUrl: () => '/deck/index.html' };
    },
    createReaderOptions(options) {
      calls.push(['readerOptions', options]);
      return { ...options, bridged: true };
    },
    capture() {
      calls.push('capture');
      return { sessionToken: 4 };
    },
    update(state) {
      calls.push(['update', state]);
      return state;
    },
    createFrameLoadHandler(options) {
      calls.push(['handler', options]);
      return 'handler';
    },
    shouldHandleFrameLoad(url, options) {
      calls.push(['guard', url, options]);
      return true;
    }
  };
  const accessors = sessionAccessors.createStudioEditorSessionAccessors({
    sessionBridgeController: bridge
  });

  assert.equal(typeof accessors.createReaders().getCurrentPresentationUrl, 'function');
  assert.deepEqual(accessors.createReaderOptions({ mode: 'live' }), {
    mode: 'live',
    bridged: true
  });
  assert.deepEqual(accessors.capture(), { sessionToken: 4 });
  assert.deepEqual(accessors.update({ slideIndex: 2 }), { slideIndex: 2 });
  assert.equal(accessors.createFrameLoadHandler({ sessionToken: 4 }), 'handler');
  assert.equal(accessors.shouldHandleFrameLoad('/deck/index.html', { sessionToken: 4 }), true);
  assert.deepEqual(calls, [
    'readers',
    ['readerOptions', { mode: 'live' }],
    'capture',
    ['update', { slideIndex: 2 }],
    ['handler', { sessionToken: 4 }],
    ['guard', '/deck/index.html', { sessionToken: 4 }]
  ]);
});

test('session accessors preserve fallback snapshots and neutral guards', () => {
  const sessionApi = {
    createStudioEditorSessionSnapshotAdapter(options) {
      return () => ({
        presentationUrl: options.getPresentationUrl(),
        sessionToken: options.getSessionToken()
      });
    }
  };
  const accessors = sessionAccessors.createStudioEditorSessionAccessors({
    sessionApi,
    getPresentationUrl: () => '/fallback/index.html',
    getSessionToken: () => 8
  });

  const readers = accessors.createReaders();
  assert.equal(readers.getCurrentPresentationUrl(), '');
  assert.equal(readers.getCurrentSessionToken(), 0);
  assert.deepEqual(accessors.capture(), {
    presentationUrl: '/fallback/index.html',
    sessionToken: 8
  });
  assert.equal(accessors.createFrameLoadHandler()(), false);
  assert.equal(accessors.shouldHandleFrameLoad('/fallback/index.html'), false);
});
