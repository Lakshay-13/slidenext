const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorSession = require('../shared/studio-editor-session.js');
const editorStatusView = require('../shared/studio-editor-status-view.js');
const editorAutoSave = require('../shared/studio-editor-autosave.js');
const autoSaveTimerFixture = require('./helpers/studio-autosave-timer-fixture.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadCaptureEditorPersistableDeckState(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  const captureEditorPersistableDeckBuildStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckBuildState(doc = getIframeDoc(), buildOptions = {}) {',
    '\n\n    function captureEditorPersistableDeckState(doc = getIframeDoc()) {'
  );
  vm.runInContext(captureEditorPersistableDeckBuildStateSource, context);
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getEditorCanonicalDeckValidator() {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  const resolveEditorCapturedPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCapturedPersistableDeckState(cleanHtml = \'\', options = {}) {',
    '\n\n    function captureEditorPersistableDeckState(doc = getIframeDoc()) {'
  );
  vm.runInContext(resolveEditorCapturedPersistableDeckStateSource, context);
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  vm.runInContext(captureEditorPersistableDeckStateSource, context);
}

function loadCreateCurrentStudioSessionStateReaders(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateReaders() {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCaptureCurrentStudioSessionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureCurrentStudioSessionState() {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('captureCurrentStudioSessionState reuses the shared session snapshot helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioSessionSnapshot(options = {}) {
        delegatedArgs = options;
        return editorSession.createStudioSessionSnapshot(options);
      }
    }
  };

  vm.createContext(context);
  loadCaptureCurrentStudioSessionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureCurrentStudioSessionState())),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 12
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs)),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 12
    }
  );
});

test('captureCurrentStudioSessionState delegates through the editor session snapshot adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorSession: {
      createStudioEditorSessionSnapshotAdapter(options = {}) {
        delegatedArgs = options;
        return () => ({
          presentationUrl: options.getPresentationUrl(),
          sessionToken: options.getSessionToken(),
          viaAdapter: true
        });
      },
      createStudioSessionSnapshot() {
        throw new Error('direct session snapshot should not run when the adapter exists');
      }
    }
  };

  vm.createContext(context);
  loadCaptureCurrentStudioSessionState(fileContent, context);

  assert.deepEqual(context.captureCurrentStudioSessionState(), {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 12,
    viaAdapter: true
  });
  assert.equal(delegatedArgs.sessionApi, context.SlideNextStudioEditorSession);
  assert.equal(delegatedArgs.getPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.getSessionToken(), 12);
});

test('captureCurrentStudioSessionState creates the shared snapshot adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let adapterCreateCalls = 0;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    SlideNextStudioEditorSession: {
      createStudioEditorSessionSnapshotAdapter(options) {
        adapterCreateCalls += 1;
        return editorSession.createStudioEditorSessionSnapshotAdapter(options);
      }
    }
  };

  vm.createContext(context);
  loadCaptureCurrentStudioSessionState(fileContent, context);

  const firstSnapshot = context.captureCurrentStudioSessionState();
  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 13;
  const secondSnapshot = context.captureCurrentStudioSessionState();

  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(firstSnapshot, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 12
  });
  assert.deepEqual(secondSnapshot, {
    presentationUrl: '/presentations/ai-tools-presentation/index.html',
    sessionToken: 13
  });
});

function loadCreateCurrentStudioSessionReaderOptions(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionReaderOptions(options = {}) {',
    '\n\n    function captureCurrentStudioSessionState() {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context) {
  if (typeof context.createCurrentStudioSessionStateReaders !== 'function') {
    loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  }
  if (typeof context.createCurrentStudioSessionReaderOptions !== 'function') {
    loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  }
  if (typeof context.applyCurrentStudioPersistedDeckState !== 'function') {
    loadApplyCurrentStudioPersistedDeckState(fileContent, context);
  }
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadIsCurrentStudioPersistenceTaskStale(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  const helperSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceTaskStale(',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadTriggerAutoSave(fileContent, context) {
  context.SlideNextStudioEditorAutoSave ??= editorAutoSave;
  const helperSource = autoSaveTimerFixture.extractAutoSaveTimerAwareFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );
  assert.notEqual(helperSource, null, 'Missing triggerAutoSave markers');
  vm.runInContext(helperSource, context);
}

test('applyCurrentStudioPersistenceFailure delegates through the shared failure helper with current handler options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let readerCallCount = 0;
  let capturedReaders = null;
  let failureHelperArgs = null;
  const onFailure = () => {};
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceFailure(persistenceContext, options = {}) {
        failureHelperArgs = {
          persistenceContext,
          options
        };
        return 'handled';
      }
    },
    applyCurrentStudioPersistedDeckState() {},
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 7
  };

  vm.createContext(context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);

  const persistenceContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const result = context.applyCurrentStudioPersistenceFailure(persistenceContext, { onFailure });

  assert.equal(result, 'handled');
  assert.equal(readerCallCount, 1);
  assert.equal(failureHelperArgs.persistenceContext, persistenceContext);
  assert.equal(failureHelperArgs.options.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(failureHelperArgs.options.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(failureHelperArgs.options.onFailure, onFailure);
  assert.equal(failureHelperArgs.options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(failureHelperArgs.options.getCurrentSessionToken(), 7);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 8;
  assert.equal(failureHelperArgs.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(failureHelperArgs.options.getCurrentSessionToken(), 8);
});

test('applyCurrentStudioPersistenceSuccess delegates through the shared success helper with current handler options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let readerCallCount = 0;
  let capturedReaders = null;
  let successHelperArgs = null;
  const onSuccess = () => {};
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceSuccess(persistenceContext, options = {}) {
        successHelperArgs = {
          persistenceContext,
          options
        };
        return 'handled';
      }
    },
    applyCurrentStudioPersistedDeckState() {},
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);

  const persistenceContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const result = context.applyCurrentStudioPersistenceSuccess(persistenceContext, { onSuccess });

  assert.equal(result, 'handled');
  assert.equal(readerCallCount, 1);
  assert.equal(successHelperArgs.persistenceContext, persistenceContext);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successHelperArgs.options.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successHelperArgs.options.onSuccess, onSuccess);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 9);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 10;
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 10);
});

test('applyCurrentStudioVersionPersistenceSuccess delegates through the shared version success helper with refresh defaults', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let readerCallCount = 0;
  let capturedReaders = null;
  let successHelperArgs = null;
  const onSuccess = () => {};
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioVersionPersistenceSuccess(persistenceContext, options = {}) {
        successHelperArgs = {
          persistenceContext,
          options
        };
        return 'handled';
      }
    },
    applyCurrentStudioPersistedDeckState() {},
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {},
    studioEditorSessionToken: 11
  };

  vm.createContext(context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);

  const persistenceContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const result = context.applyCurrentStudioVersionPersistenceSuccess(persistenceContext, { onSuccess });

  assert.equal(result, 'handled');
  assert.equal(readerCallCount, 1);
  assert.equal(successHelperArgs.persistenceContext, persistenceContext);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successHelperArgs.options.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successHelperArgs.options.refreshVersionEntries, context.loadVersions);
  assert.equal(successHelperArgs.options.onSuccess, onSuccess);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 11);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 12;
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 12);
});

test('runCurrentStudioPersistenceActionIfCurrent delegates through the shared guard with live session readers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let readerCallCount = 0;
  let capturedReaders = null;
  let delegatedArgs = null;
  let actionCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {
      runStudioPersistenceActionIfCurrent(persistenceContext, sessionOptions, action) {
        delegatedArgs = {
          persistenceContext,
          sessionOptions,
          action
        };
        action();
        return 'handled';
      }
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 14
  };

  vm.createContext(context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);

  const persistenceContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const result = context.runCurrentStudioPersistenceActionIfCurrent(persistenceContext, () => {
    actionCalls += 1;
  });

  assert.equal(result, 'handled');
  assert.equal(actionCalls, 1);
  assert.equal(readerCallCount, 1);
  assert.equal(delegatedArgs.persistenceContext, persistenceContext);
  assert.equal(delegatedArgs.sessionOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(delegatedArgs.sessionOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(delegatedArgs.sessionOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.sessionOptions.getCurrentSessionToken(), 14);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 15;
  assert.equal(delegatedArgs.sessionOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(delegatedArgs.sessionOptions.getCurrentSessionToken(), 15);
});

test('resolveCurrentStudioVersionCheckpointPersistenceState delegates through the shared checkpoint persistence resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const checkpointState = {
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioVersionCheckpointPersistenceStateFromCapture: function checkpointResolver() {}
    },
    resolveCurrentStudioPersistenceStateFromCapture(doc, options = {}) {
      delegatedArgs = {
        doc,
        options
      };
      return checkpointState;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);

  const result = context.resolveCurrentStudioVersionCheckpointPersistenceState(
    iframeDoc,
    '/presentations/onboarding-presentation/index.html',
    16
  );

  assert.equal(result, checkpointState);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(
    delegatedArgs.options.resolvePersistenceStateFromCapture,
    context.SlideNextStudioEditorPersistence.resolveStudioVersionCheckpointPersistenceStateFromCapture
  );
  assert.equal(delegatedArgs.options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.options.persistenceOptions.sessionToken, 16);
});

function loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context) {
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
}

function loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context) {
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'async function executeCurrentStudioVersionCheckpointSaveWithFailure(',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );
  vm.runInContext(helperSource, context);
}

function loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function runCurrentStudioPersistenceActionIfCurrent(persistenceContext, action) {',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioVersionCheckpointPersistenceState(',
    '\n    \n    async function submitSaveVersion() {'
  );
  vm.runInContext(helperSource, context);
}

test('setStudioSaveButtonState renders the version button loading and idle states', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setStudioSaveButtonStateSource = extractFunctionSource(
    fileContent,
    'function setStudioSaveButtonState(state) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const context = {
    document: {
      getElementById(id) {
        if (id === 'studioSaveBtn') return saveBtnEl;
        return null;
      }
    }
  };

  vm.createContext(context);
  context.SlideNextStudioEditorStatusView = editorStatusView;
  vm.runInContext(setStudioSaveButtonStateSource, context);

  context.setStudioSaveButtonState('saving-version');
  assert.equal(context.currentStudioSaveButtonState, 'saving-version');
  assert.equal(saveBtnEl.disabled, true);
  assert.match(saveBtnEl.innerHTML, /Creating version/);

  context.setStudioSaveButtonState('idle');
  assert.equal(context.currentStudioSaveButtonState, 'idle');
  assert.equal(saveBtnEl.disabled, false);
  assert.match(saveBtnEl.innerHTML, /Save Version/);
});

test('resolveCurrentStudioPersistenceStateFromCapture delegates current deck capture through the shared persistence helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    captureEditorPersistableDeckState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return capturedDeckState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);

  const result = context.resolveCurrentStudioPersistenceStateFromCapture(iframeDoc, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    persistenceOptions: {
      sessionToken: 12
    },
    resolvePersistenceStateFromCapture(doc, nextCapturedDeckState, presentationUrl, options = {}) {
      delegatedArgs = {
        doc,
        nextCapturedDeckState,
        presentationUrl,
        options
      };
      return {
        persistenceContext: {
          presentationUrl
        }
      };
    }
  });

  assert.equal(result.persistenceContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCapturedDeckState, capturedDeckState);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs.options)), {
    sessionToken: 12
  });
});

test('resolveCurrentStudioPersistenceStateFromCapture passes capture callbacks and persistence options through the shared helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };
  let delegatedArgs = null;
  let resolverArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioPersistenceStateFromDocumentCapture(nextDoc, presentationUrl, options = {}, resolvePersistenceStateFromCapture) {
        delegatedArgs = {
          nextDoc,
          presentationUrl,
          options,
          resolvePersistenceStateFromCapture
        };
        return resolvePersistenceStateFromCapture(
          nextDoc,
          options.capturePersistableDeckState(nextDoc),
          presentationUrl,
          options.persistenceOptions
        );
      }
    },
    captureEditorPersistableDeckState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return capturedDeckState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);

  const result = context.resolveCurrentStudioPersistenceStateFromCapture(iframeDoc, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    persistenceOptions: {
      sessionToken: 12
    },
    resolvePersistenceStateFromCapture(doc, nextCapturedDeckState, presentationUrl, options = {}) {
      resolverArgs = {
        doc,
        nextCapturedDeckState,
        presentationUrl,
        options
      };
      return {
        persistenceContext: {
          presentationUrl
        }
      };
    }
  });

  assert.equal(result.persistenceContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.nextDoc, iframeDoc);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof delegatedArgs.options.capturePersistableDeckState, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs.options.persistenceOptions)), {
    sessionToken: 12
  });
  assert.equal(resolverArgs.doc, iframeDoc);
  assert.equal(resolverArgs.nextCapturedDeckState, capturedDeckState);
  assert.equal(resolverArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.deepEqual(JSON.parse(JSON.stringify(resolverArgs.options)), {
    sessionToken: 12
  });
});

test('executeCurrentStudioVersionCheckpointSaveWithFailure delegates through the shared helper and applies the failure callback', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted</html>',
    requestOptions: {
      sessionToken: 12
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let failureHelperArgs = null;
  let saveArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      handleStudioPersistenceFailure(persistenceContext, options = {}) {
        failureHelperArgs = {
          persistenceContext,
          options
        };
        if (typeof options.onFailure === 'function') {
          options.onFailure();
        }
        return 'failed';
      }
    },
    saveVersionCheckpoint: async (...args) => {
      saveArgs = args;
      return {
        success: false,
        error: 'disk full'
      };
    },
    applyCurrentStudioVersionCheckpointSaveSuccess() {
      throw new Error('executeCurrentStudioVersionCheckpointSaveWithFailure should not report success for an unsuccessful result');
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => null
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html'
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);

  const failureCalls = [];
  const result = await context.executeCurrentStudioVersionCheckpointSaveWithFailure(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      onFailure(data) {
        failureCalls.push(data);
      }
    }
  );

  assert.deepEqual(saveArgs, [
    'Checkpoint Baseline',
    '<html>persisted</html>',
    '/presentations/onboarding-presentation/index.html',
    {
      sessionToken: 12
    }
  ]);
  assert.equal(failureHelperArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.equal(typeof failureHelperArgs.options.onFailure, 'function');
  assert.deepEqual(failureCalls, [{
    success: false,
    error: 'disk full'
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: false,
      error: 'disk full'
    },
    versionCheckpointPersistenceState: {
      cleanHtml: '<html>persisted</html>',
      requestOptions: {
        sessionToken: 12
      },
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  });
});

test('executeCurrentStudioVersionCheckpointSaveWithFailure reuses the shared failure-aware helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted</html>',
    requestOptions: {
      sessionToken: 12
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let helperArgs = null;
  const failureCalls = [];
  const context = {
    applyCurrentStudioVersionCheckpointSaveSuccess() {
      throw new Error('executeCurrentStudioVersionCheckpointSaveWithFailure should pass the success helper to the shared helper');
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => null
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    saveVersionCheckpoint() {
      throw new Error('executeCurrentStudioVersionCheckpointSaveWithFailure should pass saveVersionCheckpoint to the shared helper');
    },
    SlideNextStudioEditorPersistence: {
      executeStudioVersionCheckpointSaveWithFailure: async (...args) => {
        helperArgs = args;
        return {
          data: {
            success: false,
            error: 'disk full'
          },
          versionCheckpointPersistenceState
        };
      }
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);

  const result = await context.executeCurrentStudioVersionCheckpointSaveWithFailure(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      onSuccess() {},
      onFailure(data) {
        failureCalls.push(data);
      }
    }
  );

  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(helperArgs[3].saveVersionCheckpoint, context.saveVersionCheckpoint);
  assert.equal(typeof helperArgs[3].applyVersionCheckpointSaveSuccess, 'function');
  assert.equal(typeof helperArgs[3].applyPersistenceFailure, 'function');
  assert.equal(typeof helperArgs[3].successOptions.onSuccess, 'function');
  const failureOptions = helperArgs[3].buildFailureOptions({
    success: false,
    error: 'disk full'
  });
  assert.equal(typeof failureOptions.onFailure, 'function');
  failureOptions.onFailure();
  assert.deepEqual(failureCalls, [{
    success: false,
    error: 'disk full'
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: false,
      error: 'disk full'
    },
    versionCheckpointPersistenceState: {
      cleanHtml: '<html>persisted</html>',
      requestOptions: {
        sessionToken: 12
      },
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  });
});

test('submitSaveVersion keeps the save button idle when editor content is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let saveVersionCalls = 0;

  const inputEl = { value: 'Checkpoint A' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    studioEditorSessionToken: 0,
    saveVersionCheckpoint: async () => {
      saveVersionCalls += 1;
      return { success: true };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      createStudioPersistenceActionContext() {
        return {};
      },
      handleStudioPersistenceFailure() {
        return false;
      },
      handleStudioPersistenceSuccess() {
        return false;
      }
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Save version failed: editor content is unavailable.']);
  assert.equal(closeModalCalls, 0);
  assert.equal(saveVersionCalls, 0);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'Saved to disk');
});

test('submitSaveVersion can save the persisted html baseline when the editor frame is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  const loadVersionsCalls = [];
  const saveVersionCalls = [];

  const inputEl = { value: 'Checkpoint Baseline' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Checkpoint Baseline');
  assert.equal(saveVersionCalls[0][1], '<html>persisted-baseline</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 4);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    4
  ]]);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion can save rendered canonical html when the editor frame has no persisted html baseline', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  const loadVersionsCalls = [];
  const saveVersionCalls = [];

  const inputEl = { value: 'Checkpoint Canonical' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>canonical-source</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 5
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Checkpoint Canonical');
  assert.equal(saveVersionCalls[0][1], '<html>canonical-source</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 5);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    5
  ]]);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion ignores stale same-url session completions', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let loadVersionsCalls = 0;
  let resolveCheckpoint;

  const inputEl = { value: 'Checkpoint B' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { documentElement: {} };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return iframeDoc;
    },
    loadVersions() {
      loadVersionsCalls += 1;
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    saveVersionCheckpoint: () => new Promise((resolve) => {
      resolveCheckpoint = resolve;
    }),
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  const savePromise = context.submitSaveVersion();
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, true);
  assert.match(saveBtnEl.innerHTML, /Creating version/);

  context.studioEditorSessionToken = 5;
  context.resetStudioSaveButtonState();
  resolveCheckpoint({ success: true });
  await savePromise;

  assert.deepEqual(alerts, []);
  assert.equal(loadVersionsCalls, 0);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'Saved to disk');
});

test('executeSaveAutoVersion skips persistence when editor content is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  let saveVersionCalls = 0;
  const context = {
    buildEditorSaveRequestBody() {
      throw new Error('buildEditorSaveRequestBody should not run when editor content is unavailable');
    },
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted() {
      throw new Error('isCurrentDeckStatePersisted should not run when editor content is unavailable');
    },
    loadVersions() {},
    saveVersionCheckpoint: async () => {
      saveVersionCalls += 1;
      return { success: true };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(saveVersionCalls, 0);
});

test('executeSaveAutoVersion can save the persisted html baseline when the editor frame is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  const loadVersionsCalls = [];
  const logCalls = [];
  const saveVersionCalls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    applyCurrentStudioPersistenceFailure() {
      throw new Error('applyCurrentStudioPersistenceFailure should not run for successful persisted baseline saves');
    },
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, null);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck: options.canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for persisted baseline saves');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted(saveRequestBody, cleanHtml) {
      assert.equal(cleanHtml, '<html>persisted-baseline</html>');
      assert.deepEqual(saveRequestBody, {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>persisted-baseline</html>',
        versionLabel: 'Auto: Edited Text',
        canonicalDeck
      });
      return false;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Auto: Edited Text');
  assert.equal(saveVersionCalls[0][1], '<html>persisted-baseline</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 4);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    4
  ]]);
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('executeSaveAutoVersion skips redundant auto version saves when the captured state already matches the persisted baseline', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  const loadVersionsCalls = [];
  const logCalls = [];
  const saveVersionCalls = [];
  const buildRequestBodyCalls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      buildRequestBodyCalls.push([nextDoc, cleanHtml, options]);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck: options.canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors when skipping redundant version saves');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted(saveRequestBody, cleanHtml) {
      assert.equal(cleanHtml, '<html>persisted-baseline</html>');
      assert.deepEqual(saveRequestBody, {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>persisted-baseline</html>',
        versionLabel: 'Auto: Edited Text',
        canonicalDeck
      });
      return true;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  const result = await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(result, false);
  assert.equal(saveVersionCalls.length, 0);
  assert.equal(buildRequestBodyCalls.length, 1);
  assert.deepEqual(loadVersionsCalls, []);
  assert.deepEqual(logCalls, []);
});

test('submitSaveVersion reuses the local version checkpoint failure-aware helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let helperArgs = null;
  const inputEl = { value: 'Checkpoint Baseline' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    alert(message) {
      alerts.push(message);
    },
    applyCurrentStudioPersistenceFailure() {
      throw new Error('submitSaveVersion should not use the failure path for a successful helper result');
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        switch (id) {
          case 'versionCheckpointName':
            return inputEl;
          case 'studioSaveBtn':
            return saveBtnEl;
          case 'autoSaveStatus':
            return statusEl;
          default:
            throw new Error(`Unexpected element lookup: ${id}`);
        }
      }
    },
    executeCurrentStudioVersionCheckpointSaveWithFailure: async (...args) => {
      helperArgs = args;
      const helperOptions = args[3] || {};
      if (typeof helperOptions.onSuccess === 'function') {
        helperOptions.onSuccess();
      }
      return {
        data: {
          success: true
        },
        versionCheckpointPersistenceState
      };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    saveVersionCheckpoint() {
      throw new Error('submitSaveVersion should reuse executeCurrentStudioVersionCheckpointSave when it is available');
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    SlideNextStudioEditorPersistence: {
      runStudioPersistenceActionIfCurrent(persistenceContext, sessionOptions, action) {
        action();
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof helperArgs[3].onSuccess, 'function');
  assert.equal(typeof helperArgs[3].onFailure, 'function');
  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion reuses the shared version checkpoint success helper when the failure-aware helper delegates to it', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let readerCallCount = 0;
  const capturedReaders = [];
  let finalSessionOptions = null;
  let successHelperArgs = null;
  const inputEl = { value: 'Checkpoint Baseline' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    alert(message) {
      alerts.push(message);
    },
    applyCurrentStudioPersistenceFailure() {
      throw new Error('submitSaveVersion should not use the failure path for a successful helper result');
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      const readers = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      capturedReaders.push(readers);
      return readers;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        switch (id) {
          case 'versionCheckpointName':
            return inputEl;
          case 'studioSaveBtn':
            return saveBtnEl;
          case 'autoSaveStatus':
            return statusEl;
          default:
            throw new Error(`Unexpected element lookup: ${id}`);
        }
      }
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    loadVersions() {},
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    saveVersionCheckpoint: async () => ({
      success: true
    }),
    SlideNextStudioEditorPersistence: {
      executeStudioVersionCheckpointSaveWithFailure: editorPersistence.executeStudioVersionCheckpointSaveWithFailure,
      executeStudioVersionCheckpointSaveWithSuccess: editorPersistence.executeStudioVersionCheckpointSaveWithSuccess,
      handleStudioVersionPersistenceSuccess(persistenceContext, options = {}) {
        successHelperArgs = {
          persistenceContext,
          options
        };
        if (typeof options.onSuccess === 'function') {
          options.onSuccess();
        }
        return 'applied';
      },
      runStudioPersistenceActionIfCurrent(persistenceContext, sessionOptions, action) {
        finalSessionOptions = sessionOptions;
        action();
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.equal(successHelperArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.equal(readerCallCount, 2);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl, capturedReaders[0].getCurrentPresentationUrl);
  assert.equal(successHelperArgs.options.getCurrentSessionToken, capturedReaders[0].getCurrentSessionToken);
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 4);
  assert.equal(finalSessionOptions.getCurrentPresentationUrl, capturedReaders[1].getCurrentPresentationUrl);
  assert.equal(finalSessionOptions.getCurrentSessionToken, capturedReaders[1].getCurrentSessionToken);
  assert.equal(finalSessionOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(finalSessionOptions.getCurrentSessionToken(), 4);
  assert.equal(typeof successHelperArgs.options.onSuccess, 'function');
  assert.equal(typeof context.executeCurrentStudioVersionCheckpointSaveWithFailure, 'function');
  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(successHelperArgs.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successHelperArgs.options.getCurrentSessionToken(), 5);
  assert.equal(finalSessionOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(finalSessionOptions.getCurrentSessionToken(), 5);
});

test('submitSaveVersion reports network save errors through the shared persistence failure helper', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let failureHelperArgs = null;
  const inputEl = { value: 'Checkpoint Baseline' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    alert(message) {
      alerts.push(message);
    },
    applyCurrentStudioPersistenceFailure(persistenceContext, options = {}) {
      return context.SlideNextStudioEditorPersistence.handleStudioPersistenceFailure(
        persistenceContext,
        context.createCurrentStudioPersistenceHandlerOptions(options)
      );
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        marker: 'persistence-handler-options',
        ...options
      };
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        switch (id) {
          case 'versionCheckpointName':
            return inputEl;
          case 'studioSaveBtn':
            return saveBtnEl;
          case 'autoSaveStatus':
            return statusEl;
          default:
            throw new Error(`Unexpected element lookup: ${id}`);
        }
      }
    },
    executeCurrentStudioVersionCheckpointSaveWithFailure: async () => {
      throw new Error('socket down');
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceFailure(persistenceContext, options = {}) {
        failureHelperArgs = {
          persistenceContext,
          options
        };
        if (typeof options.onFailure === 'function') {
          options.onFailure();
        }
        return 'handled';
      },
      runStudioPersistenceActionIfCurrent(persistenceContext, sessionOptions, action) {
        action();
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadRunCurrentStudioPersistenceActionIfCurrent(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.equal(failureHelperArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.equal(failureHelperArgs.options.marker, 'persistence-handler-options');
  assert.equal(typeof failureHelperArgs.options.onFailure, 'function');
  assert.deepEqual(alerts, ['Network error saving version: socket down']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'network-error');
});

test('executeSaveAutoVersion reuses the local version checkpoint failure-aware helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  let helperArgs = null;
  const logCalls = [];
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    buildEditorSaveRequestBody() {
      return {};
    },
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for a successful helper result');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    __executeCurrentStudioVersionCheckpointSaveWithFailure: async (...args) => {
      helperArgs = args;
      const helperOptions = args[3] || {};
      if (typeof helperOptions.onSuccess === 'function') {
        helperOptions.onSuccess();
      }
      return {
        data: {
          success: true
        },
        versionCheckpointPersistenceState
      };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    saveVersionCheckpoint() {
      throw new Error('executeSaveAutoVersion should reuse executeCurrentStudioVersionCheckpointSave when it is available');
    },
    SlideNextStudioEditorPersistence: {
      isStudioPersistenceTaskStale() {
        return false;
      },
      isStudioVersionCheckpointSavePersisted() {
        return false;
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSaveWithFailure = __executeCurrentStudioVersionCheckpointSaveWithFailure;', context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(helperArgs[0], 'Auto: Edited Text');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof helperArgs[3].onSuccess, 'function');
  assert.equal(typeof helperArgs[3].onFailure, 'function');
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('executeSaveAutoVersion reports unsuccessful checkpoint responses through the failure-aware helper', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  const errorCalls = [];
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    buildEditorSaveRequestBody() {
      return {};
    },
    console: {
      error(message) {
        errorCalls.push(message);
      },
      log() {
        throw new Error('executeSaveAutoVersion should not report success for an unsuccessful helper result');
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    __executeCurrentStudioVersionCheckpointSaveWithFailure: async (...args) => {
      const helperOptions = args[3] || {};
      if (typeof helperOptions.onFailure === 'function') {
        helperOptions.onFailure({ error: 'disk full' });
      }
      return {
        data: {
          success: false,
          error: 'disk full'
        },
        versionCheckpointPersistenceState
      };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    SlideNextStudioEditorPersistence: {
      isStudioPersistenceTaskStale() {
        return false;
      },
      isStudioVersionCheckpointSavePersisted() {
        return false;
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSaveWithFailure = __executeCurrentStudioVersionCheckpointSaveWithFailure;', context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.deepEqual(errorCalls, ['Failed to auto-create version backup: disk full']);
});

test('executeSaveAutoVersion reuses the shared version checkpoint success helper when the failure-aware helper delegates to it', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  let successHelperArgs = null;
  const logCalls = [];
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted-baseline</html>',
    requestOptions: {
      sessionToken: 4
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  const context = {
    applyCurrentStudioPersistenceFailure() {
      throw new Error('applyCurrentStudioPersistenceFailure should not run for a successful helper result');
    },
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for a successful helper result');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    buildEditorSaveRequestBody() {
      return {};
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    loadVersions() {},
    resolveCurrentStudioPersistenceStateFromCapture() {
      return versionCheckpointPersistenceState;
    },
    saveVersionCheckpoint: async () => ({
      success: true
    }),
    SlideNextStudioEditorPersistence: {
      handleStudioVersionPersistenceSuccess(persistenceContext, options = {}) {
        successHelperArgs = {
          persistenceContext,
          options
        };
        if (typeof options.onSuccess === 'function') {
          options.onSuccess();
        }
        return 'applied';
      },
      isStudioPersistenceTaskStale() {
        return false;
      },
      isStudioVersionCheckpointSavePersisted() {
        return false;
      },
      executeStudioVersionCheckpointSaveWithFailure: editorPersistence.executeStudioVersionCheckpointSaveWithFailure,
      executeStudioVersionCheckpointSaveWithSuccess: editorPersistence.executeStudioVersionCheckpointSaveWithSuccess
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithFailure(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(successHelperArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.equal(typeof successHelperArgs.options.onSuccess, 'function');
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('triggerAutoSave skips persistence when the shared iframe accessor has no live document and no fallback html', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  let buildPersistableDeckHtmlCalls = 0;
  let fetchCalls = 0;
  let saveRequestBodyCalls = 0;
  const statusEl = {
    innerHTML: 'Saved to disk'
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody() {
      saveRequestBodyCalls += 1;
      return {};
    },
    buildPersistableDeckHtml() {
      buildPersistableDeckHtmlCalls += 1;
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async () => {
      fetchCalls += 1;
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setCurrentPresentationCanonicalDeck() {},
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  loadTriggerAutoSave(fileContent, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.equal(buildPersistableDeckHtmlCalls, 1);
  assert.equal(saveRequestBodyCalls, 0);
  assert.equal(fetchCalls, 0);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave can persist rendered canonical html when the shared iframe accessor has no live document', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const canonicalDeckUpdates = [];
  let capturedAutoSaveExecutionArgs = null;
  let buildEditorCanonicalDeckCalls = 0;
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      },
      async executeStudioAutoSavePersistenceRequestWithHandlers(...args) {
        capturedAutoSaveExecutionArgs = args;
        return editorPersistence.executeStudioAutoSavePersistenceRequestWithHandlers(
          ...args
        );
      }
    },
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, null);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>canonical-source</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, null);
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      canonicalDeckUpdates.push([nextCanonicalDeck, presentationUrl]);
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 9,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  loadTriggerAutoSave(fileContent, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>canonical-source</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(capturedAutoSaveExecutionArgs[0].persistencePlan.hasPersistedCurrentState, false);
  assert.equal(capturedAutoSaveExecutionArgs[1].fetchImpl, context.fetch);
  assert.equal(persistedStateUpdates.length, 2);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>canonical-source</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.equal(canonicalDeckUpdates.length, 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(canonicalDeckUpdates[0][0])),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.equal(canonicalDeckUpdates[0][1], '/presentations/onboarding-presentation/index.html');
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave refreshes the persisted playback baseline after a successful live-frame save rewrite', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { label: 'iframe-doc' };
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 4'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>live-save</html>';
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return playbackState;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    setCurrentPresentationCanonicalDeck() {},
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 11,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  loadTriggerAutoSave(fileContent, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>live-save</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(persistedStateUpdates.length, 3);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>live-save</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.deepEqual(persistedStateUpdates[2].playbackState, playbackState);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave clears the persisted playback baseline after a successful live-frame save rewrite without playback markers', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>null-playback-save</html>';
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    setCurrentPresentationCanonicalDeck() {},
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistenceTaskStale() {
        return false;
      }
    },
    studioEditorSessionToken: 13,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  loadTriggerAutoSave(fileContent, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>null-playback-save</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(persistedStateUpdates.length, 3);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>null-playback-save</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.ok(Object.prototype.hasOwnProperty.call(persistedStateUpdates[2], 'playbackState'));
  assert.equal(persistedStateUpdates[2].playbackState, null);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave reports network persistence errors through the shared failure helper', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  let failureHelperArgs = null;
  const errorCalls = [];
  let statusState = 'Saved to disk';
  const autoSavePersistenceState = {
    persistencePlan: {
      hasPersistedCurrentState: false,
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  };

  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceFailure(persistenceContext, options = {}) {
        failureHelperArgs = {
          persistenceContext,
          options
        };
        if (typeof options.onFailure === 'function') {
          options.onFailure();
        }
        return 'handled';
      },
      isStudioPersistenceTaskStale() {
        return false;
      },
      async executeStudioAutoSavePersistenceRequestWithHandlers() {
        throw new Error('socket down');
      }
    },
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody() {
      return {};
    },
    clearTimeout() {},
    console: {
      error(...args) {
        errorCalls.push(args);
      }
    },
    applyCurrentStudioPersistenceFailure(persistenceContext, options = {}) {
      return context.SlideNextStudioEditorPersistence.handleStudioPersistenceFailure(
        persistenceContext,
        context.createCurrentStudioPersistenceHandlerOptions(options)
      );
    },
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      return {
        marker: 'persistence-handler-options',
        ...options
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    fetch() {
      throw new Error('triggerAutoSave should not call fetch after the shared autosave helper throws');
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    resolveCurrentStudioPersistenceStateFromCapture() {
      return autoSavePersistenceState;
    },
    setStudioAutoSaveStatus(state) {
      statusState = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCaptureCurrentStudioSessionState(fileContent, context);
  loadIsCurrentStudioPersistenceTaskStale(fileContent, context);
  loadTriggerAutoSave(fileContent, context);

  context.triggerAutoSave();
  assert.equal(statusState, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.equal(failureHelperArgs.persistenceContext, autoSavePersistenceState.persistencePlan.persistenceContext);
  assert.equal(failureHelperArgs.options.marker, 'persistence-handler-options');
  assert.equal(typeof failureHelperArgs.options.onFailure, 'function');
  assert.equal(statusState, 'network-error');
  assert.equal(errorCalls.length, 1);
  assert.equal(errorCalls[0][0], 'AutoSave Error:');
  assert.equal(errorCalls[0][1].message, 'socket down');
});
