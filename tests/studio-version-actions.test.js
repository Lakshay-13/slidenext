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

test('createStudioVersionActionHandlerOptionsBuilder reuses session-reader defaults and call-time overrides', () => {
  const calls = [];
  const createVersionActionHandlerOptions = versionActions.createStudioVersionActionHandlerOptionsBuilder({
    createSessionReaderOptions(nextOptions = {}) {
      calls.push(['createSessionReaderOptions', nextOptions]);
      return {
        marker: 'default',
        ...nextOptions
      };
    }
  });

  const handlerOptions = createVersionActionHandlerOptions({
    onSuccess: 'success-sentinel',
    createSessionReaderOptions(nextOptions = {}) {
      calls.push(['overrideCreateSessionReaderOptions', nextOptions]);
      return {
        marker: 'override',
        ...nextOptions
      };
    }
  });

  assert.equal(handlerOptions.marker, 'override');
  assert.equal(handlerOptions.onSuccess, 'success-sentinel');
  assert.deepEqual(calls, [
    ['overrideCreateSessionReaderOptions', {
      onSuccess: 'success-sentinel',
      createSessionReaderOptions: calls[0] && calls[0][1] && calls[0][1].createSessionReaderOptions
    }]
  ]);
});

test('createStudioVersionRequestOptionsBuilder reuses the default fetch implementation and call-time overrides', () => {
  const defaultFetch = () => {};
  const createVersionRequestOptions = versionActions.createStudioVersionRequestOptionsBuilder({
    fetchImpl: defaultFetch
  });

  const defaultOptions = createVersionRequestOptions();
  const overrideFetch = () => {};
  const overrideOptions = createVersionRequestOptions({
    fetchImpl: overrideFetch,
    requestId: 'rename'
  });

  assert.equal(defaultOptions.fetchImpl, defaultFetch);
  assert.equal(overrideOptions.fetchImpl, overrideFetch);
  assert.equal(overrideOptions.requestId, 'rename');
});

test('createStudioVersionActionFailureHandler reuses handler-option defaults and call-time overrides', () => {
  const calls = [];
  let overrideOptionsRef = null;
  const handleVersionActionFailure = versionActions.createStudioVersionActionFailureHandler({
    createHandlerOptions(nextOptions = {}) {
      calls.push(['createHandlerOptions', nextOptions]);
      return { onFailure: nextOptions.onFailure };
    }
  });

  assert.equal(
    handleVersionActionFailure(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        sessionToken: 15
      },
      {
        onFailure: 'failure-sentinel',
        createHandlerOptions(nextOptions = {}) {
          overrideOptionsRef = nextOptions;
          calls.push(['overrideCreateHandlerOptions']);
          return { onFailure: nextOptions.onFailure, override: true };
        },
        handleVersionActionFailure(context, options = {}) {
          calls.push(['handleVersionActionFailure', context, options]);
          return options.override === true;
        }
      }
    ),
    true
  );

  assert.equal(overrideOptionsRef.onFailure, 'failure-sentinel');
  assert.deepEqual(calls, [
    ['overrideCreateHandlerOptions'],
    ['handleVersionActionFailure', {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 15
    }, {
      onFailure: 'failure-sentinel',
      override: true
    }]
  ]);
});

test('createStudioVersionListMutationSuccessHandler reuses handler-option defaults and call-time overrides', () => {
  const calls = [];
  let overrideOptionsRef = null;
  const handleVersionListMutationSuccess = versionActions.createStudioVersionListMutationSuccessHandler({
    createHandlerOptions(nextOptions = {}) {
      calls.push(['createHandlerOptions', nextOptions]);
      return { onSuccess: nextOptions.onSuccess };
    }
  });

  assert.equal(
    handleVersionListMutationSuccess(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        sessionToken: 15
      },
      {
        onSuccess: 'success-sentinel',
        createHandlerOptions(nextOptions = {}) {
          overrideOptionsRef = nextOptions;
          calls.push(['overrideCreateHandlerOptions']);
          return { onSuccess: nextOptions.onSuccess, override: true };
        },
        handleVersionListMutationSuccess(context, options = {}) {
          calls.push(['handleVersionListMutationSuccess', context, options]);
          return options.override === true;
        }
      }
    ),
    true
  );

  assert.equal(overrideOptionsRef.onSuccess, 'success-sentinel');
  assert.deepEqual(calls, [
    ['overrideCreateHandlerOptions'],
    ['handleVersionListMutationSuccess', {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 15
    }, {
      onSuccess: 'success-sentinel',
      override: true
    }]
  ]);
});

test('createStudioRestoreVersionSuccessHandler reuses handler-option defaults and call-time overrides', () => {
  const calls = [];
  let overrideOptionsRef = null;
  const handleRestoreVersionSuccess = versionActions.createStudioRestoreVersionSuccessHandler({
    createHandlerOptions(nextOptions = {}) {
      calls.push(['createHandlerOptions', nextOptions]);
      return { onSuccess: nextOptions.onSuccess };
    }
  });

  assert.equal(
    handleRestoreVersionSuccess(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        sessionToken: 15
      },
      {
        onSuccess: 'success-sentinel',
        createHandlerOptions(nextOptions = {}) {
          overrideOptionsRef = nextOptions;
          calls.push(['overrideCreateHandlerOptions']);
          return { onSuccess: nextOptions.onSuccess, override: true };
        },
        handleRestoreVersionSuccess(context, options = {}) {
          calls.push(['handleRestoreVersionSuccess', context, options]);
          return options.override === true;
        }
      }
    ),
    true
  );

  assert.equal(overrideOptionsRef.onSuccess, 'success-sentinel');
  assert.deepEqual(calls, [
    ['overrideCreateHandlerOptions'],
    ['handleRestoreVersionSuccess', {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 15
    }, {
      onSuccess: 'success-sentinel',
      override: true
    }]
  ]);
});

test('executeStudioVersionActionRequest posts the supplied request init and returns the parsed response payload', async () => {
  const fetchCalls = [];

  const result = await versionActions.executeStudioVersionActionRequest(
    {
      url: '/api/versions/delete',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: '/presentations/onboarding-presentation/index.html'
        })
      }
    },
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/versions/delete',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html'
    }
  ]]);
  assert.deepEqual(result, { success: true });
});

test('createStudioRestoreVersionRequest builds the restore endpoint payload from the active version context', () => {
  const restoreContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );

  assert.deepEqual(
    versionActions.createStudioRestoreVersionRequest(
      'index_20260101_120000_Auto.html',
      restoreContext
    ),
    {
      url: '/api/restore',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: '/presentations/onboarding-presentation/index.html',
          versionFilename: 'index_20260101_120000_Auto.html'
        })
      }
    }
  );
});

test('executeStudioRestoreVersionRequest posts the restore request and returns the parsed response payload', async () => {
  const restoreContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const fetchCalls = [];

  const result = await versionActions.executeStudioRestoreVersionRequest(
    'index_20260101_120000_Auto.html',
    restoreContext,
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/restore',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      versionFilename: 'index_20260101_120000_Auto.html'
    }
  ]]);
  assert.deepEqual(result, { success: true });
});

test('createStudioRenameVersionRequest builds the rename endpoint payload from the active version context', () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );

  assert.deepEqual(
    versionActions.createStudioRenameVersionRequest(
      'index_20260101_120000_Auto.html',
      'Draft Name',
      renameContext
    ),
    {
      url: '/api/versions/rename',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: '/presentations/onboarding-presentation/index.html',
          versionFilename: 'index_20260101_120000_Auto.html',
          newLabel: 'Draft Name'
        })
      }
    }
  );
});

test('executeStudioRenameVersionRequest posts the rename request and returns the parsed response payload', async () => {
  const renameContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const fetchCalls = [];

  const result = await versionActions.executeStudioRenameVersionRequest(
    'index_20260101_120000_Auto.html',
    'Draft Name',
    renameContext,
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/versions/rename',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      versionFilename: 'index_20260101_120000_Auto.html',
      newLabel: 'Draft Name'
    }
  ]]);
  assert.deepEqual(result, { success: true });
});

test('createStudioDeleteVersionRequest builds the delete endpoint payload from the active version context', () => {
  const deleteContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );

  assert.deepEqual(
    versionActions.createStudioDeleteVersionRequest(
      'index_20260101_120000_Auto.html',
      deleteContext
    ),
    {
      url: '/api/versions/delete',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: '/presentations/onboarding-presentation/index.html',
          versionFilename: 'index_20260101_120000_Auto.html'
        })
      }
    }
  );
});

test('executeStudioDeleteVersionRequest posts the delete request and returns the parsed response payload', async () => {
  const deleteContext = versionActions.createStudioVersionActionContext(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    'General'
  );
  const fetchCalls = [];

  const result = await versionActions.executeStudioDeleteVersionRequest(
    'index_20260101_120000_Auto.html',
    deleteContext,
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/versions/delete',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      versionFilename: 'index_20260101_120000_Auto.html'
    }
  ]]);
  assert.deepEqual(result, { success: true });
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
