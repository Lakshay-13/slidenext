const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorSession = require('../shared/studio-editor-session.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadCaptureEditorPersistableDeckState(fileContent, context) {
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  vm.runInContext(captureEditorPersistableDeckStateSource, context);
}

function loadCreateCurrentStudioSessionStateOptions(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateOptions(options = {}) {',
    '\n\n    function createCurrentStudioFrameLoadHandler('
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function applyCurrentStudioPersistedCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedPlaybackState(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function createCurrentStudioVersionPersistenceHandlerOptions(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context) {
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedCanonicalDeck(',
    '\n\n    function applyCurrentStudioPersistedPlaybackState('
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedPlaybackState(fileContent, context) {
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedPlaybackState(playbackState = null) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionPersistenceHandlerOptions(options = {}) {',
    '\n\n    function applyCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistenceSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {',
    '\n\n    function applyCurrentStudioPersistenceFailure(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistenceFailure(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistenceFailure(persistenceContext, options = {}) {',
    '\n\n    function applyCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {',
    '\n\n    function applyCurrentStudioVersionCheckpointSaveSuccess(versionCheckpointPersistenceState, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionCheckpointSaveSuccess(versionCheckpointPersistenceState, options = {}) {',
    '\n\n    function applyCurrentStudioCapturedDeckState('
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioVersionCheckpointPersistenceState(',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioAutoSavePersistenceState(',
    '\n\n    async function executeCurrentStudioAutoSavePersistenceRequestWithHandlers('
  );
  vm.runInContext(helperSource, context);
}

function loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'async function executeCurrentStudioAutoSavePersistenceRequestWithHandlers(',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );
  vm.runInContext(helperSource, context);
}

function loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'async function executeCurrentStudioVersionCheckpointSave(',
    '\n\n    async function executeCurrentStudioVersionCheckpointSaveWithSuccess('
  );
  vm.runInContext(helperSource, context);
}

function loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'async function executeCurrentStudioVersionCheckpointSaveWithSuccess(',
    '\n\n    function isCurrentStudioVersionCheckpointSavePersisted('
  );
  vm.runInContext(helperSource, context);
}

function loadIsCurrentStudioVersionCheckpointSavePersisted(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioVersionCheckpointSavePersisted(',
    '\n\n    function resolveCurrentStudioAutoSavePersistenceState('
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioPersistenceStateFromCapture(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {',
    '\n\n    function resolveCurrentStudioVersionCheckpointPersistenceState('
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
  vm.runInContext(setStudioSaveButtonStateSource, context);

  context.setStudioSaveButtonState('saving-version');
  assert.equal(saveBtnEl.disabled, true);
  assert.match(saveBtnEl.innerHTML, /Creating version/);

  context.setStudioSaveButtonState('idle');
  assert.equal(saveBtnEl.disabled, false);
  assert.match(saveBtnEl.innerHTML, /Save Version/);
});

test('resolveCurrentStudioPersistenceStateFromCapture captures the current deck state before delegating to a persistence resolver', () => {
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

test('resolveCurrentStudioPersistenceStateFromCapture reuses the shared document capture helper when available', () => {
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

test('resolveCurrentStudioVersionCheckpointPersistenceState delegates checkpoint capture through the shared persistence helper', () => {
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
    SlideNextStudioEditorPersistence: {
      resolveStudioVersionCheckpointPersistenceStateFromCapture(doc, nextCapturedDeckState, presentationUrl, options = {}) {
        delegatedArgs = {
          doc,
          nextCapturedDeckState,
          presentationUrl,
          options
        };
        return {
          cleanHtml: '<html>persisted</html>',
          persistenceContext: {
            presentationUrl
          },
          requestOptions: options
        };
      }
    },
    captureEditorPersistableDeckState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return capturedDeckState;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return iframeDoc;
    },
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);

  const result = context.resolveCurrentStudioVersionCheckpointPersistenceState();

  assert.equal(result.cleanHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCapturedDeckState, capturedDeckState);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs.options)), {
    sessionToken: 12
  });
});

test('resolveCurrentStudioVersionCheckpointPersistenceState reuses the local capture delegation helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const context = {
    __resolveCurrentStudioPersistenceStateFromCapture(nextDoc, options = {}) {
      delegatedArgs = {
        nextDoc,
        options
      };
      return {
        cleanHtml: '<html>persisted</html>'
      };
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioVersionCheckpointPersistenceStateFromCapture() {
        throw new Error('shared resolver should be called through the local capture delegation helper');
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return iframeDoc;
    },
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  vm.runInContext('resolveCurrentStudioPersistenceStateFromCapture = __resolveCurrentStudioPersistenceStateFromCapture;', context);

  const result = context.resolveCurrentStudioVersionCheckpointPersistenceState();
  assert.equal(result.cleanHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.nextDoc, iframeDoc);
  assert.equal(delegatedArgs.options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(
    delegatedArgs.options.resolvePersistenceStateFromCapture,
    context.SlideNextStudioEditorPersistence.resolveStudioVersionCheckpointPersistenceStateFromCapture
  );
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs.options.persistenceOptions)), {
    sessionToken: 12
  });
});

test('resolveCurrentStudioAutoSavePersistenceState delegates autosave capture through the shared persistence helper', () => {
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
    SlideNextStudioEditorPersistence: {
      resolveStudioAutoSavePersistenceStateFromCapture(doc, nextCapturedDeckState, presentationUrl, options = {}) {
        delegatedArgs = {
          doc,
          nextCapturedDeckState,
          presentationUrl,
          options
        };
        return {
          persistencePlan: {
            persistenceContext: {
              presentationUrl
            }
          }
        };
      }
    },
    buildEditorSaveRequestBody() {
      return {};
    },
    captureEditorPersistableDeckState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return capturedDeckState;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);

  const result = context.resolveCurrentStudioAutoSavePersistenceState();

  assert.equal(result.persistencePlan.persistenceContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCapturedDeckState, capturedDeckState);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.options.isPersistedState, context.isCurrentDeckStatePersisted);
  assert.equal(delegatedArgs.options.buildSaveRequestBody, context.buildEditorSaveRequestBody);
  assert.equal(delegatedArgs.options.sessionToken, 13);
});

test('resolveCurrentStudioAutoSavePersistenceState reuses the local capture delegation helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const context = {
    __resolveCurrentStudioPersistenceStateFromCapture(nextDoc, options = {}) {
      delegatedArgs = {
        nextDoc,
        options
      };
      return {
        persistencePlan: {
          persistenceContext: {
            presentationUrl: options.presentationUrl
          }
        }
      };
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioAutoSavePersistenceStateFromCapture() {
        throw new Error('shared autosave resolver should be called through the local capture delegation helper');
      }
    },
    buildEditorSaveRequestBody() {
      return {};
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);
  vm.runInContext('resolveCurrentStudioPersistenceStateFromCapture = __resolveCurrentStudioPersistenceStateFromCapture;', context);

  const result = context.resolveCurrentStudioAutoSavePersistenceState();
  assert.equal(result.persistencePlan.persistenceContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.nextDoc, iframeDoc);
  assert.equal(delegatedArgs.options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(
    delegatedArgs.options.resolvePersistenceStateFromCapture,
    context.SlideNextStudioEditorPersistence.resolveStudioAutoSavePersistenceStateFromCapture
  );
  assert.equal(delegatedArgs.options.persistenceOptions.isPersistedState, context.isCurrentDeckStatePersisted);
  assert.equal(delegatedArgs.options.persistenceOptions.buildSaveRequestBody, context.buildEditorSaveRequestBody);
  assert.equal(delegatedArgs.options.persistenceOptions.sessionToken, 13);
});

test('executeCurrentStudioVersionCheckpointSave saves the resolved checkpoint state and returns the result bundle', async () => {
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
  let saveArgs = null;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    saveVersionCheckpoint: async (...args) => {
      saveArgs = args;
      return {
        success: true
      };
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);

  const result = await context.executeCurrentStudioVersionCheckpointSave(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState
  );

  assert.deepEqual(saveArgs, [
    'Checkpoint Baseline',
    '<html>persisted</html>',
    '/presentations/onboarding-presentation/index.html',
    {
      sessionToken: 12
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: true
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
  assert.equal(result.versionCheckpointPersistenceState, versionCheckpointPersistenceState);
});

test('executeCurrentStudioVersionCheckpointSave reuses the shared version checkpoint save helper when available', async () => {
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
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    saveVersionCheckpoint() {
      throw new Error('executeCurrentStudioVersionCheckpointSave should reuse the shared helper when it is available');
    },
    SlideNextStudioEditorPersistence: {
      executeStudioVersionCheckpointSave: async (...args) => {
        helperArgs = args;
        return {
          data: {
            success: true
          },
          versionCheckpointPersistenceState
        };
      }
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);

  const result = await context.executeCurrentStudioVersionCheckpointSave(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState
  );

  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof helperArgs[3].saveVersionCheckpoint, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: true
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

test('executeCurrentStudioVersionCheckpointSaveWithSuccess reuses the local save and success helpers when the save succeeds', async () => {
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
  let saveArgs = null;
  let successArgs = null;
  const onSuccess = () => {};
  const context = {
    __executeCurrentStudioVersionCheckpointSave: async (...args) => {
      saveArgs = args;
      return {
        data: {
          success: true
        },
        versionCheckpointPersistenceState
      };
    },
    __applyCurrentStudioVersionCheckpointSaveSuccess(nextVersionCheckpointPersistenceState, options = {}) {
      successArgs = {
        nextVersionCheckpointPersistenceState,
        options
      };
      return 'applied';
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSave = __executeCurrentStudioVersionCheckpointSave;', context);
  vm.runInContext('applyCurrentStudioVersionCheckpointSaveSuccess = __applyCurrentStudioVersionCheckpointSaveSuccess;', context);

  const result = await context.executeCurrentStudioVersionCheckpointSaveWithSuccess(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      onSuccess
    }
  );

  assert.deepEqual(saveArgs, [
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html'
  ]);
  assert.equal(successArgs.nextVersionCheckpointPersistenceState, versionCheckpointPersistenceState);
  assert.equal(successArgs.options.onSuccess, onSuccess);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: true
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

test('executeCurrentStudioVersionCheckpointSaveWithSuccess reuses the shared combined helper when available', async () => {
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
  const context = {
    applyCurrentStudioVersionCheckpointSaveSuccess() {
      throw new Error('executeCurrentStudioVersionCheckpointSaveWithSuccess should reuse the shared combined helper when it is available');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    saveVersionCheckpoint() {
      throw new Error('executeCurrentStudioVersionCheckpointSaveWithSuccess should pass saveVersionCheckpoint to the shared combined helper');
    },
    SlideNextStudioEditorPersistence: {
      executeStudioVersionCheckpointSaveWithSuccess: async (...args) => {
        helperArgs = args;
        return {
          data: {
            success: true
          },
          versionCheckpointPersistenceState
        };
      }
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);

  const result = await context.executeCurrentStudioVersionCheckpointSaveWithSuccess(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      marker: 'version-success'
    }
  );

  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(helperArgs[3].saveVersionCheckpoint, context.saveVersionCheckpoint);
  assert.equal(helperArgs[3].applyVersionCheckpointSaveSuccess, context.applyCurrentStudioVersionCheckpointSaveSuccess);
  assert.deepEqual(JSON.parse(JSON.stringify(helperArgs[3].successOptions)), {
    marker: 'version-success'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: true
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

test('isCurrentStudioVersionCheckpointSavePersisted reuses the shared persisted-state helper when available', () => {
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
  const context = {
    SlideNextStudioEditorPersistence: {
      isStudioVersionCheckpointSavePersisted(...args) {
        helperArgs = args;
        return true;
      }
    },
    buildEditorSaveRequestBody() {
      throw new Error('shared persisted-state helper should receive the buildSaveRequestBody callback instead');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    isCurrentDeckStatePersisted() {
      throw new Error('shared persisted-state helper should receive the isPersistedState callback instead');
    },
    saveVersionCheckpoint: async () => ({ success: true })
  };

  vm.createContext(context);
  loadIsCurrentStudioVersionCheckpointSavePersisted(fileContent, context);

  const result = context.isCurrentStudioVersionCheckpointSavePersisted(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState
  );

  assert.equal(result, true);
  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(helperArgs[3].isPersistedState, context.isCurrentDeckStatePersisted);
  assert.equal(helperArgs[3].buildSaveRequestBody, context.buildEditorSaveRequestBody);
});

test('applyCurrentStudioPersistenceSuccess delegates through the shared persistence helper with current handler options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistenceContext = { presentationUrl: '/presentations/onboarding-presentation/index.html' };
  const onSuccess = () => {};
  let capturedHandlerOptionsArgs = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceSuccess(nextPersistenceContext, handlerOptions) {
        delegatedArgs = {
          nextPersistenceContext,
          handlerOptions
        };
        return 'applied';
      }
    },
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      capturedHandlerOptionsArgs = options;
      return {
        marker: 'persistence-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistenceSuccess(fileContent, context);

  const result = context.applyCurrentStudioPersistenceSuccess(persistenceContext, {
    presentationUrl: persistenceContext.presentationUrl,
    onSuccess
  });

  assert.equal(result, 'applied');
  assert.equal(capturedHandlerOptionsArgs.presentationUrl, persistenceContext.presentationUrl);
  assert.equal(capturedHandlerOptionsArgs.onSuccess, onSuccess);
  assert.equal(delegatedArgs.nextPersistenceContext, persistenceContext);
  assert.equal(delegatedArgs.handlerOptions.marker, 'persistence-handler-options');
  assert.equal(delegatedArgs.handlerOptions.onSuccess, onSuccess);
});

test('applyCurrentStudioPersistenceFailure delegates through the shared failure helper with current handler options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistenceContext = { presentationUrl: '/presentations/onboarding-presentation/index.html' };
  const onFailure = () => {};
  let capturedHandlerOptionsArgs = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioPersistenceFailure(nextPersistenceContext, handlerOptions) {
        delegatedArgs = {
          nextPersistenceContext,
          handlerOptions
        };
        return 'failed';
      }
    },
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      capturedHandlerOptionsArgs = options;
      return {
        marker: 'failure-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);

  const result = context.applyCurrentStudioPersistenceFailure(persistenceContext, {
    onFailure
  });

  assert.equal(result, 'failed');
  assert.equal(capturedHandlerOptionsArgs.onFailure, onFailure);
  assert.equal(delegatedArgs.nextPersistenceContext, persistenceContext);
  assert.equal(delegatedArgs.handlerOptions.marker, 'failure-handler-options');
  assert.equal(delegatedArgs.handlerOptions.onFailure, onFailure);
});

test('applyCurrentStudioVersionPersistenceSuccess delegates through the shared version helper with current handler options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistenceContext = { presentationUrl: '/presentations/onboarding-presentation/index.html' };
  const onSuccess = () => {};
  let capturedHandlerOptionsArgs = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      handleStudioVersionPersistenceSuccess(nextPersistenceContext, handlerOptions) {
        delegatedArgs = {
          nextPersistenceContext,
          handlerOptions
        };
        return 'version-applied';
      }
    },
    createCurrentStudioVersionPersistenceHandlerOptions(options = {}) {
      capturedHandlerOptionsArgs = options;
      return {
        marker: 'version-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);

  const result = context.applyCurrentStudioVersionPersistenceSuccess(persistenceContext, {
    onSuccess
  });

  assert.equal(result, 'version-applied');
  assert.equal(capturedHandlerOptionsArgs.onSuccess, onSuccess);
  assert.equal(delegatedArgs.nextPersistenceContext, persistenceContext);
  assert.equal(delegatedArgs.handlerOptions.marker, 'version-handler-options');
  assert.equal(delegatedArgs.handlerOptions.onSuccess, onSuccess);
});

test('applyCurrentStudioVersionCheckpointSaveSuccess delegates through the local version persistence helper with checkpoint context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const versionCheckpointPersistenceState = {
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let delegatedArgs = null;
  const onSuccess = () => {};
  const context = {
    applyCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {
      delegatedArgs = {
        persistenceContext,
        options
      };
      return 'applied';
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);

  const result = context.applyCurrentStudioVersionCheckpointSaveSuccess(
    versionCheckpointPersistenceState,
    {
      onSuccess
    }
  );

  assert.equal(result, 'applied');
  assert.equal(delegatedArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.equal(delegatedArgs.options.onSuccess, onSuccess);
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
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
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
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
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
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
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
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
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
    isStaleEditorPersistenceTask() {
      return false;
    },
    loadVersions() {},
    saveVersionCheckpoint: async () => {
      saveVersionCalls += 1;
      return { success: true };
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  loadIsCurrentStudioVersionCheckpointSavePersisted(fileContent, context);
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
    isStaleEditorPersistenceTask() {
      return false;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  loadIsCurrentStudioVersionCheckpointSavePersisted(fileContent, context);
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
    isStaleEditorPersistenceTask() {
      return false;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioVersionPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioVersionCheckpointSaveSuccess(fileContent, context);
  loadResolveCurrentStudioVersionCheckpointPersistenceState(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSave(fileContent, context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  loadIsCurrentStudioVersionCheckpointSavePersisted(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  const result = await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(result, false);
  assert.equal(saveVersionCalls.length, 0);
  assert.equal(buildRequestBodyCalls.length, 1);
  assert.deepEqual(loadVersionsCalls, []);
  assert.deepEqual(logCalls, []);
});

test('submitSaveVersion reuses the local version checkpoint save-with-success helper when available', async () => {
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
    createCurrentStudioSessionStateOptions() {
      return {};
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
    executeCurrentStudioVersionCheckpointSaveWithSuccess: async (...args) => {
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
    resolveCurrentStudioVersionCheckpointPersistenceState() {
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
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.equal(helperArgs[0], 'Checkpoint Baseline');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof helperArgs[3].onSuccess, 'function');
  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion reuses the local version checkpoint success helper when the save-with-success helper delegates to it', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
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
    __applyCurrentStudioVersionCheckpointSaveSuccess(nextVersionCheckpointPersistenceState, options = {}) {
      successHelperArgs = {
        nextVersionCheckpointPersistenceState,
        options
      };
      if (typeof options.onSuccess === 'function') {
        options.onSuccess();
      }
      return 'applied';
    },
    __executeCurrentStudioVersionCheckpointSave: async () => ({
      data: {
        success: true
      },
      versionCheckpointPersistenceState
    }),
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateOptions() {
      return {};
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
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    resolveCurrentStudioVersionCheckpointPersistenceState() {
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
      runStudioPersistenceActionIfCurrent(persistenceContext, sessionOptions, action) {
        action();
      }
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  vm.runInContext('applyCurrentStudioVersionCheckpointSaveSuccess = __applyCurrentStudioVersionCheckpointSaveSuccess;', context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSave = __executeCurrentStudioVersionCheckpointSave;', context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.equal(successHelperArgs.nextVersionCheckpointPersistenceState, versionCheckpointPersistenceState);
  assert.equal(typeof successHelperArgs.options.onSuccess, 'function');
  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('executeSaveAutoVersion reuses the local version checkpoint save-with-success helper when available', async () => {
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
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for a successful helper result');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    __executeCurrentStudioVersionCheckpointSaveWithSuccess: async (...args) => {
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
    isStaleEditorPersistenceTask() {
      return false;
    },
    resolveCurrentStudioVersionCheckpointPersistenceState() {
      return versionCheckpointPersistenceState;
    },
    saveVersionCheckpoint() {
      throw new Error('executeSaveAutoVersion should reuse executeCurrentStudioVersionCheckpointSave when it is available');
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSaveWithSuccess = __executeCurrentStudioVersionCheckpointSaveWithSuccess;', context);
  vm.runInContext('isCurrentStudioVersionCheckpointSavePersisted = () => false;', context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(helperArgs[0], 'Auto: Edited Text');
  assert.equal(helperArgs[1], versionCheckpointPersistenceState);
  assert.equal(helperArgs[2], '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof helperArgs[3].onSuccess, 'function');
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('executeSaveAutoVersion reuses the local version checkpoint success helper when the save-with-success helper delegates to it', async () => {
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
    __applyCurrentStudioVersionCheckpointSaveSuccess(nextVersionCheckpointPersistenceState, options = {}) {
      successHelperArgs = {
        nextVersionCheckpointPersistenceState,
        options
      };
      if (typeof options.onSuccess === 'function') {
        options.onSuccess();
      }
      return 'applied';
    },
    __executeCurrentStudioVersionCheckpointSave: async () => ({
      data: {
        success: true
      },
      versionCheckpointPersistenceState
    }),
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for a successful helper result');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isCurrentStudioVersionCheckpointSavePersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    resolveCurrentStudioVersionCheckpointPersistenceState() {
      return versionCheckpointPersistenceState;
    },
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadExecuteCurrentStudioVersionCheckpointSaveWithSuccess(fileContent, context);
  vm.runInContext('applyCurrentStudioVersionCheckpointSaveSuccess = __applyCurrentStudioVersionCheckpointSaveSuccess;', context);
  vm.runInContext('executeCurrentStudioVersionCheckpointSave = __executeCurrentStudioVersionCheckpointSave;', context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(successHelperArgs.nextVersionCheckpointPersistenceState, versionCheckpointPersistenceState);
  assert.equal(typeof successHelperArgs.options.onSuccess, 'function');
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('executeCurrentStudioAutoSavePersistenceRequestWithHandlers reuses the shared autosave helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const autoSavePersistenceState = {
    persistencePlan: {
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  };
  let helperArgs = null;
  const context = {
    applyCurrentStudioPersistenceFailure() {
      throw new Error('executeCurrentStudioAutoSavePersistenceRequestWithHandlers should pass the failure helper to the shared helper');
    },
    applyCurrentStudioPersistenceSuccess() {
      throw new Error('executeCurrentStudioAutoSavePersistenceRequestWithHandlers should pass the success helper to the shared helper');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    fetch() {
      throw new Error('executeCurrentStudioAutoSavePersistenceRequestWithHandlers should pass fetch to the shared helper');
    },
    SlideNextStudioEditorPersistence: {
      executeStudioAutoSavePersistenceRequestWithHandlers: async (...args) => {
        helperArgs = args;
        return {
          data: {
            success: true
          },
          autoSavePersistenceState
        };
      }
    }
  };

  vm.createContext(context);
  loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context);

  const result = await context.executeCurrentStudioAutoSavePersistenceRequestWithHandlers(
    autoSavePersistenceState,
    {
      onSuccess() {},
      onFailure() {}
    }
  );

  assert.equal(helperArgs[0], autoSavePersistenceState);
  assert.equal(helperArgs[1].fetchImpl, context.fetch);
  assert.equal(helperArgs[1].applyPersistenceSuccess, context.applyCurrentStudioPersistenceSuccess);
  assert.equal(helperArgs[1].applyPersistenceFailure, context.applyCurrentStudioPersistenceFailure);
  assert.deepEqual(JSON.parse(JSON.stringify(helperArgs[1].successOptions)), {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(typeof helperArgs[1].successOptions.onSuccess, 'function');
  assert.equal(typeof helperArgs[1].failureOptions.onFailure, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: {
      success: true
    },
    autoSavePersistenceState: {
      persistencePlan: {
        persistenceContext: {
          presentationUrl: '/presentations/onboarding-presentation/index.html'
        }
      }
    }
  });
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
    isStaleEditorPersistenceTask() {
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
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);
  loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

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
    isStaleEditorPersistenceTask() {
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
  loadApplyCurrentStudioPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);
  loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

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
    isStaleEditorPersistenceTask() {
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
    studioEditorSessionToken: 11,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);
  loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

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
    isStaleEditorPersistenceTask() {
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
    studioEditorSessionToken: 13,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  loadApplyCurrentStudioPersistenceSuccess(fileContent, context);
  loadApplyCurrentStudioPersistenceFailure(fileContent, context);
  loadResolveCurrentStudioAutoSavePersistenceState(fileContent, context);
  loadExecuteCurrentStudioAutoSavePersistenceRequestWithHandlers(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

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
