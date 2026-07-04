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

test('createStudioFrameLoadStateOptions preserves the supplied session readers and frame hooks', () => {
  const getCurrentPresentationUrl = () => '/presentations/onboarding-presentation/index.html';
  const getCurrentSessionToken = () => 5;
  const isEditorActive = () => true;
  const handleLoad = () => {};
  const afterLoad = () => {};

  const options = editorSession.createStudioFrameLoadStateOptions({
    sessionToken: 5,
    getCurrentPresentationUrl,
    getCurrentSessionToken,
    isEditorActive,
    handleLoad,
    afterLoad
  });

  assert.equal(options.sessionToken, 5);
  assert.equal(options.getCurrentPresentationUrl, getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, getCurrentSessionToken);
  assert.equal(options.isEditorActive, isEditorActive);
  assert.equal(options.handleLoad, handleLoad);
  assert.equal(options.afterLoad, afterLoad);
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
