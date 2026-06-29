const test = require('node:test');
const assert = require('node:assert/strict');

const versionActions = require('../shared/studio-version-actions.js');

test('shouldDebounceStudioAutoVersion matches the existing frequent-action checkpoint heuristic', () => {
  assert.equal(versionActions.STUDIO_AUTO_VERSION_TIMER_KEY, 'frequent_action');
  assert.equal(versionActions.STUDIO_AUTO_VERSION_DEBOUNCE_MS, 10000);

  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Moved element'), true);
  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Edited title block'), true);
  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Changed background'), true);
  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Rearranged layers'), true);
  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Added Slide'), false);
  assert.equal(versionActions.shouldDebounceStudioAutoVersion('Deleted Element'), false);
});

test('createStudioVersionActionContext normalizes the captured deck state', () => {
  assert.deepEqual(
    versionActions.createStudioVersionActionContext(
      '/presentations/onboarding-presentation/index.html',
      'Project Onboarding',
      'General'
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      presentationTitle: 'Project Onboarding',
      presentationCategory: 'General'
    }
  );

  assert.deepEqual(versionActions.createStudioVersionActionContext(), {
    presentationUrl: '',
    presentationTitle: '',
    presentationCategory: ''
  });

  assert.deepEqual(
    versionActions.createStudioVersionActionContext(
      '/presentations/onboarding-presentation/index.html',
      'Project Onboarding',
      'General',
      { sessionToken: 7 }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      presentationTitle: 'Project Onboarding',
      presentationCategory: 'General',
      sessionToken: 7
    }
  );
});

test('createStudioVersionActionHandlerOptions preserves the supplied session readers and hooks', () => {
  const getCurrentPresentationUrl = () => '/presentations/onboarding-presentation/index.html';
  const getCurrentSessionToken = () => 8;
  const hooks = {
    isCurrentSession() {
      return true;
    },
    onSuccess() {},
    onFailure() {},
    hideVersionsDropdown() {},
    relaunchEditor() {},
    refreshVersionEntries() {}
  };

  const options = versionActions.createStudioVersionActionHandlerOptions({
    getCurrentPresentationUrl,
    getCurrentSessionToken,
    ...hooks
  });

  assert.equal(options.getCurrentPresentationUrl, getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, getCurrentSessionToken);
  assert.equal(options.isCurrentSession, hooks.isCurrentSession);
  assert.equal(options.onSuccess, hooks.onSuccess);
  assert.equal(options.onFailure, hooks.onFailure);
  assert.equal(options.hideVersionsDropdown, hooks.hideVersionsDropdown);
  assert.equal(options.relaunchEditor, hooks.relaunchEditor);
  assert.equal(options.refreshVersionEntries, hooks.refreshVersionEntries);
});

test('handleStudioRestoreVersionSuccess applies restore hooks for the active deck only', () => {
  const restoreContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioRestoreVersionSuccess(restoreContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    onSuccess(context) {
      calls.push(['onSuccess', context.presentationUrl]);
    },
    hideVersionsDropdown() {
      calls.push(['hideVersionsDropdown']);
    },
    relaunchEditor(presentationUrl, presentationTitle, presentationCategory) {
      calls.push(['relaunchEditor', presentationUrl, presentationTitle, presentationCategory]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['hideVersionsDropdown'],
    ['relaunchEditor', '/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General']
  ]);
});

test('handleStudioRestoreVersionSuccess skips stale restore completions', () => {
  const restoreContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioRestoreVersionSuccess(restoreContext, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    onSuccess() {
      calls.push(['onSuccess']);
    },
    hideVersionsDropdown() {
      calls.push(['hideVersionsDropdown']);
    },
    relaunchEditor() {
      calls.push(['relaunchEditor']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionListMutationSuccess refreshes the active deck versions list', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General',
    { sessionToken: 6 }
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionListMutationSuccess(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 6,
    onSuccess(context) {
      calls.push(['onSuccess', context.presentationUrl]);
    },
    refreshVersionEntries(presentationUrl, sessionToken) {
      calls.push(['refreshVersionEntries', presentationUrl, sessionToken]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['refreshVersionEntries', '/presentations/onboarding-presentation/index.html', 6]
  ]);
});

test('handleStudioVersionListMutationSuccess skips stale deck refreshes', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionListMutationSuccess(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    onSuccess() {
      calls.push(['onSuccess']);
    },
    refreshVersionEntries() {
      calls.push(['refreshVersionEntries']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionListMutationSuccess skips stale modal sessions', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionListMutationSuccess(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    isCurrentSession: () => false,
    onSuccess() {
      calls.push(['onSuccess']);
    },
    refreshVersionEntries() {
      calls.push(['refreshVersionEntries']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionListMutationSuccess skips stale same-url editor sessions', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General',
    { sessionToken: 4 }
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionListMutationSuccess(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 5,
    onSuccess() {
      calls.push(['onSuccess']);
    },
    refreshVersionEntries() {
      calls.push(['refreshVersionEntries']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionActionFailure reports failures only for the active session', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionActionFailure(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    isCurrentSession: () => true,
    onFailure(context) {
      calls.push(['onFailure', context.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [['onFailure', '/presentations/onboarding-presentation/index.html']]);
});

test('handleStudioVersionActionFailure skips stale sessions', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionActionFailure(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    isCurrentSession: () => false,
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioRestoreVersionSuccess skips stale same-url editor sessions', () => {
  const restoreContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General',
    { sessionToken: 9 }
  );
  const calls = [];

  const applied = versionActions.handleStudioRestoreVersionSuccess(restoreContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 10,
    onSuccess() {
      calls.push(['onSuccess']);
    },
    hideVersionsDropdown() {
      calls.push(['hideVersionsDropdown']);
    },
    relaunchEditor() {
      calls.push(['relaunchEditor']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});
