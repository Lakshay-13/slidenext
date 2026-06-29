const test = require('node:test');
const assert = require('node:assert/strict');

const editorSession = require('../shared/studio-editor-session.js');

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
