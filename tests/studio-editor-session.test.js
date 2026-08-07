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
