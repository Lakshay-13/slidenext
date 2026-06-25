const test = require('node:test');
const assert = require('node:assert/strict');

const versionActions = require('../shared/studio-version-actions.js');

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
    'General'
  );
  const calls = [];

  const applied = versionActions.handleStudioVersionListMutationSuccess(renameContext, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    onSuccess(context) {
      calls.push(['onSuccess', context.presentationUrl]);
    },
    refreshVersionEntries(presentationUrl) {
      calls.push(['refreshVersionEntries', presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['refreshVersionEntries', '/presentations/onboarding-presentation/index.html']
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
