const test = require('node:test');
const assert = require('node:assert/strict');

const editorSession = require('../shared/studio-editor-session.js');

test('createStudioSessionStateReaders exposes supplied live readers and normalizes fallback state', () => {
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  let currentSessionToken = 4;
  const readers = editorSession.createStudioSessionStateReaders({
    getCurrentPresentationUrl: () => currentPresentationUrl,
    getCurrentSessionToken: () => currentSessionToken
  });

  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 4);

  currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  currentSessionToken = 5;
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 5);

  const fallbackReaders = editorSession.createStudioSessionStateReaders({
    currentPresentationUrl: null,
    currentSessionToken: 'invalid'
  });
  assert.equal(fallbackReaders.getCurrentPresentationUrl(), '');
  assert.equal(fallbackReaders.getCurrentSessionToken(), null);
});

test('createStudioEditorSessionStateReadersAdapter delegates live readers through the shared session API', () => {
  let delegatedOptions = null;
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  let currentSessionToken = 4;
  const adapter = editorSession.createStudioEditorSessionStateReadersAdapter({
    sessionApi: {
      createStudioSessionStateReaders(options) {
        delegatedOptions = options;
        return editorSession.createStudioSessionStateReaders(options);
      }
    },
    getCurrentPresentationUrl: () => currentPresentationUrl,
    getCurrentSessionToken: () => currentSessionToken
  });

  const readers = adapter();
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 4);
  assert.equal(delegatedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedOptions.getCurrentSessionToken(), 4);

  currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  currentSessionToken = 5;
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 5);
});

test('createStudioEditorSessionStateReadersAdapter supports call-time factory and reader overrides', () => {
  let capturedOptions = null;
  const adapter = editorSession.createStudioEditorSessionStateReadersAdapter({
    getCurrentPresentationUrl: () => '/presentations/default/index.html',
    getCurrentSessionToken: () => 4
  });

  const readers = adapter({
    createSessionStateReaders(options) {
      capturedOptions = options;
      return {
        getCurrentPresentationUrl: options.getCurrentPresentationUrl,
        getCurrentSessionToken: options.getCurrentSessionToken
      };
    },
    getCurrentPresentationUrl: () => '/presentations/custom/index.html',
    getCurrentSessionToken: () => 15
  });

  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/custom/index.html');
  assert.equal(readers.getCurrentSessionToken(), 15);
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/custom/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 15);
});

test('createStudioSessionReaderOptionsBuilder reuses live session readers and call-time overrides', () => {
  const calls = [];
  const createSessionReaderOptions = editorSession.createStudioSessionReaderOptionsBuilder({
    readCurrentSessionState() {
      calls.push(['readCurrentSessionState']);
      return {
        getCurrentPresentationUrl: () => '/presentations/default/index.html',
        getCurrentSessionToken: () => 3
      };
    }
  });

  const sessionReaderOptions = createSessionReaderOptions({
    onLoad: 'default-sentinel',
    readCurrentSessionState() {
      calls.push(['overrideReadCurrentSessionState']);
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 12
      };
    }
  });

  assert.equal(sessionReaderOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(sessionReaderOptions.getCurrentSessionToken(), 12);
  assert.equal(sessionReaderOptions.onLoad, 'default-sentinel');
  assert.deepEqual(calls, [
    ['overrideReadCurrentSessionState']
  ]);
});

test('createStudioEditorSessionReaderOptionsAdapter delegates builder input and preserves live reader options', () => {
  let delegatedArgs = null;
  const adapter = editorSession.createStudioEditorSessionReaderOptionsAdapter({
    sessionApi: {
      createStudioSessionReaderOptionsBuilder(options) {
        delegatedArgs = options;
        return editorSession.createStudioSessionReaderOptionsBuilder(options);
      }
    },
    readCurrentSessionState: () => ({
      getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
      getCurrentSessionToken: () => 12
    })
  });

  const sessionReaderOptions = adapter({ onLoad: 'load-sentinel' });
  assert.equal(sessionReaderOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(sessionReaderOptions.getCurrentSessionToken(), 12);
  assert.equal(sessionReaderOptions.onLoad, 'load-sentinel');
  assert.equal(delegatedArgs.readCurrentSessionState().getCurrentSessionToken(), 12);
});

test('createStudioEditorSessionReaderOptionsAdapter supports call-time builder and reader overrides', () => {
  let capturedArgs = null;
  const adapter = editorSession.createStudioEditorSessionReaderOptionsAdapter({
    readCurrentSessionState: () => ({
      getCurrentPresentationUrl: () => '/presentations/default/index.html',
      getCurrentSessionToken: () => 4
    })
  });

  const sessionReaderOptions = adapter({
    createSessionReaderOptionsBuilder(options) {
      capturedArgs = options;
      return nextOptions => ({
        ...options.readCurrentSessionState(),
        ...nextOptions,
        builderUsed: true
      });
    },
    readCurrentSessionState: () => ({
      getCurrentPresentationUrl: () => '/presentations/custom/index.html',
      getCurrentSessionToken: () => 15
    }),
    onLoad: 'custom-sentinel'
  });

  assert.equal(sessionReaderOptions.getCurrentPresentationUrl(), '/presentations/custom/index.html');
  assert.equal(sessionReaderOptions.getCurrentSessionToken(), 15);
  assert.equal(sessionReaderOptions.onLoad, 'custom-sentinel');
  assert.equal(sessionReaderOptions.builderUsed, true);
  assert.equal(capturedArgs.readCurrentSessionState().getCurrentSessionToken(), 15);
});

test('createStudioSessionSnapshot preserves the supplied presentation identity and normalized session token', () => {
  const snapshot = editorSession.createStudioSessionSnapshot({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 4
  });

  assert.deepEqual(snapshot, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 4
  });

  const normalizedSnapshot = editorSession.createStudioSessionSnapshot({
    presentationUrl: null,
    sessionToken: 'invalid'
  });

  assert.deepEqual(normalizedSnapshot, {
    presentationUrl: '',
    sessionToken: null
  });
});

test('createStudioEditorSessionSnapshotAdapter delegates live identity through the shared snapshot helper', () => {
  let delegatedArgs = null;
  const adapter = editorSession.createStudioEditorSessionSnapshotAdapter({
    sessionApi: {
      createStudioSessionSnapshot(options) {
        delegatedArgs = options;
        return { ...options, normalized: true };
      }
    },
    getPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getSessionToken: () => 12
  });

  assert.deepEqual(adapter(), {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 12,
    normalized: true
  });
  assert.deepEqual(delegatedArgs, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 12
  });
});

test('createStudioEditorSessionSnapshotAdapter supports call-time reader overrides', () => {
  const adapter = editorSession.createStudioEditorSessionSnapshotAdapter({
    getPresentationUrl: () => '/presentations/default/index.html',
    getSessionToken: () => 4
  });

  assert.deepEqual(adapter({
    getPresentationUrl: () => '/presentations/custom/index.html',
    getSessionToken: () => 15
  }), {
    presentationUrl: '/presentations/custom/index.html',
    sessionToken: 15
  });
});

test('createStudioEditorSessionSnapshotAdapter returns a raw snapshot without a shared helper', () => {
  const adapter = editorSession.createStudioEditorSessionSnapshotAdapter({
    presentationUrl: '/presentations/deck/index.html',
    sessionToken: 8
  });

  assert.deepEqual(adapter(), {
    presentationUrl: '/presentations/deck/index.html',
    sessionToken: 8
  });
});

test('createStudioPresentationSessionStateUpdate normalizes only the provided presentation session fields', () => {
  const metadata = { id: 'deck-1' };
  const sessionStateUpdate = editorSession.createStudioPresentationSessionStateUpdate({
    presentationTitle: 'Renamed Deck',
    slideIndex: 4,
    presentationMetadata: metadata
  });

  assert.deepEqual(sessionStateUpdate, {
    presentationTitle: 'Renamed Deck',
    slideIndex: 4,
    presentationMetadata: metadata
  });

  const normalizedSessionStateUpdate = editorSession.createStudioPresentationSessionStateUpdate({
    presentationUrl: null,
    presentationCategory: 42,
    slideIndex: 'invalid'
  });

  assert.deepEqual(normalizedSessionStateUpdate, {
    presentationUrl: '',
    presentationCategory: '',
    slideIndex: 0
  });
});

test('createStudioEditorPresentationSessionStateUpdateAdapter delegates to the shared normalizer', () => {
  let delegatedState = null;
  const adapter = editorSession.createStudioEditorPresentationSessionStateUpdateAdapter({
    sessionApi: {
      createStudioPresentationSessionStateUpdate(nextState) {
        delegatedState = nextState;
        return { normalized: true };
      }
    }
  });

  assert.deepEqual(adapter({ presentationTitle: 'Renamed Deck' }), { normalized: true });
  assert.deepEqual(delegatedState, { presentationTitle: 'Renamed Deck' });
});

test('createStudioEditorPresentationSessionStateUpdateAdapter supports call-time normalizer overrides', () => {
  const adapter = editorSession.createStudioEditorPresentationSessionStateUpdateAdapter();

  assert.deepEqual(adapter(
    { slideIndex: 4 },
    {
      createSessionStateUpdate(nextState) {
        return { overridden: nextState.slideIndex };
      }
    }
  ), { overridden: 4 });
});

test('createStudioEditorPresentationSessionStateController normalizes and applies session fields', () => {
  const calls = [];
  const metadata = { id: 'deck-1' };
  const controller = editorSession.createStudioEditorPresentationSessionStateController({
    sessionApi: editorSession,
    setPresentationUrl(value) {
      calls.push(['presentationUrl', value]);
    },
    setPresentationTitle(value) {
      calls.push(['presentationTitle', value]);
    },
    setPresentationCategory(value) {
      calls.push(['presentationCategory', value]);
    },
    setSlideIndex(value) {
      calls.push(['slideIndex', value]);
    },
    setPresentationMetadata(value) {
      calls.push(['presentationMetadata', value]);
    }
  });

  assert.deepEqual(controller.update({
    presentationUrl: null,
    presentationTitle: 'Deck',
    presentationCategory: 42,
    slideIndex: 'invalid',
    presentationMetadata: metadata
  }), {
    presentationUrl: '',
    presentationTitle: 'Deck',
    presentationCategory: '',
    slideIndex: 0,
    presentationMetadata: metadata
  });
  assert.deepEqual(calls, [
    ['presentationUrl', ''],
    ['presentationTitle', 'Deck'],
    ['presentationCategory', ''],
    ['slideIndex', 0],
    ['presentationMetadata', metadata]
  ]);
});

test('createStudioEditorPresentationSessionStateController captures the live session identity', () => {
  let presentationUrl = '/presentations/deck/index.html';
  let sessionToken = 4;
  const controller = editorSession.createStudioEditorPresentationSessionStateController({
    sessionApi: editorSession,
    getPresentationUrl: () => presentationUrl,
    getSessionToken: () => sessionToken
  });

  assert.deepEqual(controller.capture(), {
    presentationUrl: '/presentations/deck/index.html',
    sessionToken: 4
  });

  presentationUrl = '/presentations/other/index.html';
  sessionToken = 5;
  assert.deepEqual(controller.capture(), {
    presentationUrl: '/presentations/other/index.html',
    sessionToken: 5
  });
});

test('shouldHandleStudioFrameLoad requires an active matching editor session', () => {
  assert.equal(editorSession.shouldHandleStudioFrameLoad('', {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    editorActive: true
  }), false);

  assert.equal(editorSession.shouldHandleStudioFrameLoad(
    '/presentations/onboarding-presentation/index.html',
    {
      currentPresentationUrl: '/presentations/ai-tools-presentation/index.html',
      editorActive: true
    }
  ), false);

  assert.equal(editorSession.shouldHandleStudioFrameLoad(
    '/presentations/onboarding-presentation/index.html',
    {
      currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
      editorActive: false
    }
  ), false);

  assert.equal(editorSession.shouldHandleStudioFrameLoad(
    '/presentations/onboarding-presentation/index.html',
    {
      getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
      isEditorActive: () => true
    }
  ), true);
});

test('shouldHandleStudioFrameLoad rejects stale same-url editor session tokens', () => {
  assert.equal(editorSession.shouldHandleStudioFrameLoad(
    '/presentations/onboarding-presentation/index.html',
    {
      sessionToken: 2,
      getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
      getCurrentSessionToken: () => 3,
      isEditorActive: () => true
    }
  ), false);

  assert.equal(editorSession.shouldHandleStudioFrameLoad(
    '/presentations/onboarding-presentation/index.html',
    {
      sessionToken: 3,
      getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
      getCurrentSessionToken: () => 3,
      isEditorActive: () => true
    }
  ), true);
});

test('createStudioEditorFrameLoadGuardAdapter delegates URL and session options through the session API', () => {
  let delegatedUrl = null;
  let delegatedOptions = null;
  const adapter = editorSession.createStudioEditorFrameLoadGuardAdapter({
    sessionApi: {
      shouldHandleStudioFrameLoad(expectedPresentationUrl, options) {
        delegatedUrl = expectedPresentationUrl;
        delegatedOptions = options;
        return true;
      }
    }
  });

  const options = { sessionToken: 8 };
  assert.equal(adapter('/presentations/deck/index.html', options), true);
  assert.equal(delegatedUrl, '/presentations/deck/index.html');
  assert.equal(delegatedOptions, options);
});

test('createStudioEditorFrameLoadGuardAdapter falls back to the shared guard', () => {
  const adapter = editorSession.createStudioEditorFrameLoadGuardAdapter();
  assert.equal(adapter('', { editorActive: true }), false);
  assert.equal(adapter('/presentations/deck/index.html', {
    currentPresentationUrl: '/presentations/deck/index.html',
    editorActive: true
  }), true);
});

test('createStudioFrameLoadHandler runs load hooks for the active editor session', () => {
  const calls = [];
  const onLoad = editorSession.createStudioFrameLoadHandler({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    isEditorActive: () => true,
    handleLoad() {
      calls.push('handleLoad');
    },
    afterLoad() {
      calls.push('afterLoad');
    }
  });

  assert.equal(onLoad(), true);
  assert.deepEqual(calls, ['handleLoad', 'afterLoad']);
});

test('createStudioFrameLoadHandler skips stale editor sessions', () => {
  const calls = [];
  const onLoad = editorSession.createStudioFrameLoadHandler({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    isEditorActive: () => true,
    handleLoad() {
      calls.push('handleLoad');
    },
    afterLoad() {
      calls.push('afterLoad');
    }
  });

  assert.equal(onLoad(), false);
  assert.deepEqual(calls, []);
});

test('createStudioFrameLoadHandler skips stale same-url reopen sessions', () => {
  const calls = [];
  const onLoad = editorSession.createStudioFrameLoadHandler({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 4,
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 5,
    isEditorActive: () => true,
    handleLoad() {
      calls.push('handleLoad');
    },
    afterLoad() {
      calls.push('afterLoad');
    }
  });

  assert.equal(onLoad(), false);
  assert.deepEqual(calls, []);
});

test('createStudioEditorFrameLoadHandlerAdapter delegates handler options through the session API', () => {
  let delegatedOptions = null;
  const adapter = editorSession.createStudioEditorFrameLoadHandlerAdapter({
    sessionApi: {
      createStudioFrameLoadHandler(options) {
        delegatedOptions = options;
        return () => 'loaded';
      }
    }
  });

  const onLoad = adapter({ presentationUrl: '/presentations/deck/index.html' });
  assert.equal(onLoad(), 'loaded');
  assert.deepEqual(delegatedOptions, {
    presentationUrl: '/presentations/deck/index.html'
  });
});

test('createStudioEditorFrameLoadHandlerAdapter supports call-time options without mutating them', () => {
  const adapter = editorSession.createStudioEditorFrameLoadHandlerAdapter();
  const handleLoad = () => {};
  const options = {
    presentationUrl: '/presentations/deck/index.html',
    handleLoad
  };
  const onLoad = adapter(options);

  assert.equal(onLoad(), false);
  assert.equal(options.handleLoad, handleLoad);
});
