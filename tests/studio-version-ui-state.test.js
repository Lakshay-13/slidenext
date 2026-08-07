const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modalVisibility = require('../shared/studio-modal-visibility.js');
const editorSession = require('../shared/studio-editor-session.js');
const versionActions = require('../shared/studio-version-actions.js');
const versionHistory = require('../shared/studio-version-history.js');
const versionView = require('../shared/studio-version-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
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

function loadCreateCurrentStudioSessionReaderOptions(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionReaderOptions(options = {}) {',
    '\n\n    function captureCurrentStudioSessionState() {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioVersionActionFailure(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionActionFailure(versionContext, options = {}) {',
    '\n\n    function applyCurrentStudioVersionListMutationSuccess(versionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionListMutationSuccess(versionContext, options = {}) {',
    '\n\n    function applyCurrentStudioRestoreVersionSuccess(versionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioRestoreVersionSuccess(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioRestoreVersionSuccess(versionContext, options = {}) {',
    '\n\n    function createCurrentStudioVersionRequestOptions(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHideCurrentStudioVersionsDropdown(fileContent, context) {
  context.SlideNextStudioVersionView ??= versionView;
  const helperSource = extractFunctionSource(
    fileContent,
    'function hideCurrentStudioVersionsDropdown() {',
    '\n\n    function resetStudioVersionUiState(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHideCurrentStudioVersionModal(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function hideCurrentStudioVersionModal(modal, content) {',
    '\n\n    function hideCurrentStudioVersionModalImmediately(modal, content) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHideCurrentStudioVersionModalImmediately(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function hideCurrentStudioVersionModalImmediately(modal, content) {',
    '\n\n    function hideCurrentStudioVersionsDropdown() {'
  );
  vm.runInContext(helperSource, context);
}

function loadShowCurrentStudioVersionModal(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function showCurrentStudioVersionModal(modal, content, options = {}) {',
    '\n\n    function hideCurrentStudioVersionModal(modal, content) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioVersionRequestOptions(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionRequestOptions(options = {}) {',
    '\n\n    async function restoreVersion(filename) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResetCurrentStudioRenameVersionButtonState(fileContent, context) {
  context.SlideNextStudioVersionView ??= versionView;
  const helperSource = extractFunctionSource(
    fileContent,
    "function resetCurrentStudioRenameVersionButtonState(button = document.getElementById('confirmRenameVersionBtn')) {",
    "\n\n    function setCurrentStudioRenameVersionButtonBusyState(button = document.getElementById('confirmRenameVersionBtn')) {"
  );
  vm.runInContext(helperSource, context);
}

function loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context) {
  context.SlideNextStudioVersionView ??= versionView;
  const helperSource = extractFunctionSource(
    fileContent,
    "function setCurrentStudioRenameVersionButtonBusyState(button = document.getElementById('confirmRenameVersionBtn')) {",
    '\n    \n    async function submitRenameVersion() {'
  );
  vm.runInContext(helperSource, context);
}

function loadResetCurrentStudioRenameVersionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resetCurrentStudioRenameVersionState() {',
    "\n\n    function resetCurrentStudioRenameVersionButtonState(button = document.getElementById('confirmRenameVersionBtn')) {"
  );
  vm.runInContext(helperSource, context);
}

test('hideCurrentStudioVersionsDropdown hides the menu when present', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const versionsDropdown = {
    classList: createClassList()
  };
  const context = {
    document: {
      getElementById(id) {
        if (id === 'versionsDropdown') {
          return versionsDropdown;
        }
        return null;
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);

  context.hideCurrentStudioVersionsDropdown();

  assert.equal(versionsDropdown.classList.contains('hidden'), true);
});

test('hideCurrentStudioVersionsDropdown tolerates a missing menu', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    document: {
      getElementById() {
        return null;
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);

  assert.doesNotThrow(() => {
    context.hideCurrentStudioVersionsDropdown();
  });
});

test('hideCurrentStudioVersionModal hides the modal chrome when present', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const modal = {
    classList: createClassList(['opacity-100'])
  };
  const content = {
    classList: createClassList(['scale-100'])
  };
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      scheduleStudioModalHide(nextModal, options) {
        calls.push(['scheduleStudioModalHide', nextModal, options.hideDelayMs]);
        options.onHide();
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionModal(fileContent, context);

  context.hideCurrentStudioVersionModal(modal, content);

  assert.equal(modal.classList.contains('opacity-100'), false);
  assert.equal(modal.classList.contains('opacity-0'), true);
  assert.equal(modal.classList.contains('hidden'), true);
  assert.equal(content.classList.contains('scale-100'), false);
  assert.equal(content.classList.contains('scale-95'), true);
  assert.deepEqual(calls, [['scheduleStudioModalHide', modal, 200]]);
});

test('hideCurrentStudioVersionModal tolerates missing chrome nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      scheduleStudioModalHide() {
        calls.push('scheduleStudioModalHide');
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionModal(fileContent, context);

  assert.doesNotThrow(() => {
    context.hideCurrentStudioVersionModal(null, null);
  });
  assert.deepEqual(calls, []);
});

test('hideCurrentStudioVersionModalImmediately hides chrome and cancels pending hides', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const modal = {
    classList: createClassList(['opacity-100'])
  };
  const content = {
    classList: createClassList(['scale-100'])
  };
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide(nextModal) {
        calls.push(['cancelStudioModalHide', nextModal]);
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionModalImmediately(fileContent, context);

  context.hideCurrentStudioVersionModalImmediately(modal, content);

  assert.equal(modal.classList.contains('hidden'), true);
  assert.equal(modal.classList.contains('opacity-0'), true);
  assert.equal(modal.classList.contains('opacity-100'), false);
  assert.equal(content.classList.contains('scale-95'), true);
  assert.equal(content.classList.contains('scale-100'), false);
  assert.deepEqual(calls, [['cancelStudioModalHide', modal]]);
});

test('hideCurrentStudioVersionModalImmediately tolerates missing chrome nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide() {
        calls.push('cancelStudioModalHide');
      }
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionModalImmediately(fileContent, context);

  assert.doesNotThrow(() => {
    context.hideCurrentStudioVersionModalImmediately(null, null);
  });
  assert.deepEqual(calls, []);
});

test('showCurrentStudioVersionModal reveals chrome immediately when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const modal = {
    classList: createClassList(['hidden', 'opacity-0']),
    offsetHeight: 0
  };
  const content = {
    classList: createClassList(['scale-95'])
  };
  const calls = [];
  let shownCalls = 0;
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide(nextModal) {
        calls.push(['cancelStudioModalHide', nextModal]);
      },
      scheduleStudioModalCallback() {
        calls.push(['scheduleStudioModalCallback']);
      }
    }
  };

  vm.createContext(context);
  loadShowCurrentStudioVersionModal(fileContent, context);

  context.showCurrentStudioVersionModal(modal, content, {
    forceReflow: true,
    onShown() {
      shownCalls += 1;
    }
  });

  assert.equal(modal.classList.contains('hidden'), false);
  assert.equal(modal.classList.contains('opacity-0'), false);
  assert.equal(modal.classList.contains('opacity-100'), true);
  assert.equal(content.classList.contains('scale-95'), false);
  assert.equal(content.classList.contains('scale-100'), true);
  assert.equal(shownCalls, 1);
  assert.deepEqual(calls, [['cancelStudioModalHide', modal]]);
});

test('showCurrentStudioVersionModal defers chrome changes when delay is requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const modal = {
    classList: createClassList(['hidden', 'opacity-0'])
  };
  const content = {
    classList: createClassList(['scale-95'])
  };
  const calls = [];
  let shownCalls = 0;
  let scheduledCallback = null;
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide(nextModal) {
        calls.push(['cancelStudioModalHide', nextModal]);
      },
      scheduleStudioModalCallback(nextModal, options) {
        calls.push(['scheduleStudioModalCallback', nextModal, options.delayMs]);
        scheduledCallback = options.callback;
      }
    }
  };

  vm.createContext(context);
  loadShowCurrentStudioVersionModal(fileContent, context);

  context.showCurrentStudioVersionModal(modal, content, {
    delayMs: 10,
    onShown() {
      shownCalls += 1;
    }
  });

  assert.equal(modal.classList.contains('hidden'), false);
  assert.equal(modal.classList.contains('opacity-0'), true);
  assert.equal(modal.classList.contains('opacity-100'), false);
  assert.equal(content.classList.contains('scale-95'), true);
  assert.equal(content.classList.contains('scale-100'), false);
  assert.equal(typeof scheduledCallback, 'function');
  assert.equal(shownCalls, 0);
  assert.deepEqual(calls, [
    ['cancelStudioModalHide', modal],
    ['scheduleStudioModalCallback', modal, 10]
  ]);

  scheduledCallback();

  assert.equal(modal.classList.contains('opacity-0'), false);
  assert.equal(modal.classList.contains('opacity-100'), true);
  assert.equal(content.classList.contains('scale-95'), false);
  assert.equal(content.classList.contains('scale-100'), true);
  assert.equal(shownCalls, 1);
});

test('version modal chrome wrappers reuse the shared controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const showSource = extractFunctionSource(
    fileContent,
    'function showCurrentStudioVersionModal(modal, content, options = {}) {',
    '\n\n    function hideCurrentStudioVersionModal'
  );
  const hideSource = extractFunctionSource(
    fileContent,
    'function hideCurrentStudioVersionModal(modal, content) {',
    '\n\n    function hideCurrentStudioVersionModalImmediately'
  );
  const hideImmediatelySource = extractFunctionSource(
    fileContent,
    'function hideCurrentStudioVersionModalImmediately(modal, content) {',
    '\n\n    function hideCurrentStudioVersionsDropdown'
  );
  const calls = [];
  const controller = {
    show(...args) {
      calls.push(['show', ...args]);
      return 'shown';
    },
    hide(...args) {
      calls.push(['hide', ...args]);
      return 'hidden';
    },
    hideImmediately(...args) {
      calls.push(['hideImmediately', ...args]);
      return 'hidden-immediately';
    }
  };
  const modalVisibility = {
    createStudioModalChromeController(options) {
      calls.push(['create', options.modalVisibility === modalVisibility]);
      return controller;
    }
  };
  const context = {
    SlideNextStudioModalVisibility: modalVisibility
  };
  vm.createContext(context);
  vm.runInContext(showSource, context);
  vm.runInContext(hideSource, context);
  vm.runInContext(hideImmediatelySource, context);

  const modal = {};
  const content = {};
  const options = { delayMs: 10 };
  assert.equal(context.showCurrentStudioVersionModal(modal, content, options), 'shown');
  assert.equal(context.hideCurrentStudioVersionModal(modal, content), 'hidden');
  assert.equal(context.hideCurrentStudioVersionModalImmediately(modal, content), 'hidden-immediately');
  assert.deepEqual(calls, [
    ['create', true],
    ['show', modal, content, options],
    ['create', true],
    ['hide', modal, content],
    ['create', true],
    ['hideImmediately', modal, content]
  ]);
});

test('resetCurrentStudioRenameVersionState clears pending rename context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    renamingFilename: 'draft.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  loadResetCurrentStudioRenameVersionState(fileContent, context);

  context.resetCurrentStudioRenameVersionState();

  assert.equal(context.renamingFilename, '');
  assert.equal(context.renamingVersionContext, null);
});

test('resetCurrentStudioRenameVersionButtonState restores the rename button by default lookup', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const button = {
    disabled: true,
    textContent: 'Renaming...'
  };
  const context = {
    document: {
      getElementById(id) {
        calls.push(id);
        if (id === 'confirmRenameVersionBtn') {
          return button;
        }
        return null;
      }
    }
  };

  vm.createContext(context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);

  context.resetCurrentStudioRenameVersionButtonState();

  assert.deepEqual(calls, ['confirmRenameVersionBtn']);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Rename');
});

test('resetCurrentStudioRenameVersionButtonState tolerates a missing rename button', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    document: {
      getElementById() {
        return null;
      }
    }
  };

  vm.createContext(context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);

  assert.doesNotThrow(() => {
    context.resetCurrentStudioRenameVersionButtonState();
  });
});

test('setCurrentStudioRenameVersionButtonBusyState restores the busy rename label by default lookup', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const button = {
    disabled: false,
    textContent: 'Rename'
  };
  const context = {
    document: {
      getElementById(id) {
        calls.push(id);
        if (id === 'confirmRenameVersionBtn') {
          return button;
        }
        return null;
      }
    }
  };

  vm.createContext(context);
  loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context);

  context.setCurrentStudioRenameVersionButtonBusyState();

  assert.deepEqual(calls, ['confirmRenameVersionBtn']);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Renaming...');
});

test('createCurrentStudioVersionActionContext captures the active presentation version context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionContext() {',
    '\n\n    async function restoreVersion(filename) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        calls.push([presentationUrl, presentationTitle, presentationCategory, options]);
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    studioEditorSessionToken: 11
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(context.createCurrentStudioVersionActionContext(), {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 11
  });

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.currentTitle = 'AI Tools';
  context.currentCategory = 'Technology';
  context.studioEditorSessionToken = 12;

  assert.deepEqual(context.createCurrentStudioVersionActionContext(), {
    presentationUrl: '/presentations/ai-tools-presentation/index.html',
    presentationTitle: 'AI Tools',
    presentationCategory: 'Technology',
    sessionToken: 12
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][1], 'Project Onboarding');
  assert.equal(calls[0][2], 'General');
  assert.equal(calls[0][3].sessionToken, 11);
  assert.equal(calls[1][0], '/presentations/ai-tools-presentation/index.html');
  assert.equal(calls[1][1], 'AI Tools');
  assert.equal(calls[1][2], 'Technology');
  assert.equal(calls[1][3].sessionToken, 12);
});

test('createCurrentStudioVersionActionContext reuses the shared version-action context builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionContext() {',
    '\n\n    function createCurrentStudioVersionActionHandlerOptions(options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionContextBuilder(options = {}) {
        delegatedArgs = options;
        return () => ({
          presentationUrl: options.getPresentationUrl(),
          presentationTitle: options.getPresentationTitle(),
          presentationCategory: options.getPresentationCategory(),
          sessionToken: options.getSessionToken(),
          createVersionActionContext: typeof options.createVersionActionContext
        });
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    studioEditorSessionToken: 11
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createCurrentStudioVersionActionContext())),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      presentationTitle: 'Project Onboarding',
      presentationCategory: 'General',
      sessionToken: 11,
      createVersionActionContext: 'function'
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.getPresentationTitle(), 'Project Onboarding');
  assert.equal(delegatedArgs.getPresentationCategory(), 'General');
  assert.equal(delegatedArgs.getSessionToken(), 11);
  assert.equal(
    delegatedArgs.createVersionActionContext,
    context.SlideNextStudioVersionActions.createStudioVersionActionContext
  );
});

test('createCurrentStudioVersionActionHandlerOptions merges live session readers with handler callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionHandlerOptions(options = {}) {',
    '\n\n    async function restoreVersion(filename) {'
  );

  let readerCallCount = 0;
  let capturedReaders = null;
  const onSuccess = () => {};
  const context = {
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);

  const handlerOptions = context.createCurrentStudioVersionActionHandlerOptions({ onSuccess });
  assert.equal(readerCallCount, 1);
  assert.equal(handlerOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(handlerOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(handlerOptions.onSuccess, onSuccess);
  assert.equal(handlerOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(handlerOptions.getCurrentSessionToken(), 21);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 22;
  assert.equal(handlerOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(handlerOptions.getCurrentSessionToken(), 22);
});

test('createCurrentStudioVersionActionHandlerOptions reuses the shared version-action handler-options builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionHandlerOptions(options = {}) {',
    '\n\n    function applyCurrentStudioVersionActionFailure(versionContext, options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioSessionReaderOptions() {},
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionHandlerOptionsBuilder(options = {}) {
        delegatedArgs = options;
        return (nextOptions = {}) => ({
          createSessionReaderOptions: typeof options.createSessionReaderOptions,
          onSuccess: nextOptions.onSuccess
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createCurrentStudioVersionActionHandlerOptions({
      onSuccess: 'success-sentinel'
    }))),
    {
      createSessionReaderOptions: 'function',
      onSuccess: 'success-sentinel'
    }
  );
  assert.equal(delegatedArgs.createSessionReaderOptions, context.createCurrentStudioSessionReaderOptions);
});

test('applyCurrentStudioVersionActionFailure delegates through the shared handler options helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let failureArgs = null;
  const onFailure = () => {};
  const versionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const context = {
    SlideNextStudioVersionActions: {
      handleStudioVersionActionFailure(nextVersionContext, options) {
        failureArgs = [nextVersionContext, options];
        return 'handled';
      }
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        marker: 'version-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);

  const result = context.applyCurrentStudioVersionActionFailure(versionContext, { onFailure });

  assert.equal(result, 'handled');
  assert.equal(failureArgs[0], versionContext);
  assert.equal(failureArgs[1].marker, 'version-handler-options');
  assert.equal(failureArgs[1].onFailure, onFailure);
});

test('applyCurrentStudioVersionActionFailure reuses the shared failure handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionActionFailure(versionContext, options = {}) {',
    '\n\n    function applyCurrentStudioVersionListMutationSuccess(versionContext, options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioVersionActionHandlerOptions() {},
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionFailureHandler(options = {}) {
        delegatedArgs = options;
        return (versionContext, nextOptions = {}) => ({
          versionContext,
          createHandlerOptions: typeof options.createHandlerOptions,
          handleVersionActionFailure: typeof options.handleVersionActionFailure,
          onFailure: nextOptions.onFailure
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioVersionActionFailure(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      {
        onFailure: 'failure-sentinel'
      }
    ))),
    {
      versionContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      createHandlerOptions: 'function',
      handleVersionActionFailure: 'function',
      onFailure: 'failure-sentinel'
    }
  );
  assert.equal(delegatedArgs.createHandlerOptions, context.createCurrentStudioVersionActionHandlerOptions);
  assert.equal(
    delegatedArgs.handleVersionActionFailure,
    context.SlideNextStudioVersionActions.handleStudioVersionActionFailure
  );
});

test('applyCurrentStudioVersionListMutationSuccess delegates through the shared handler options helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let successArgs = null;
  const onSuccess = () => {};
  const versionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const context = {
    SlideNextStudioVersionActions: {
      handleStudioVersionListMutationSuccess(nextVersionContext, options) {
        successArgs = [nextVersionContext, options];
        return 'handled';
      }
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        marker: 'version-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);

  const result = context.applyCurrentStudioVersionListMutationSuccess(versionContext, { onSuccess });

  assert.equal(result, 'handled');
  assert.equal(successArgs[0], versionContext);
  assert.equal(successArgs[1].marker, 'version-handler-options');
  assert.equal(successArgs[1].onSuccess, onSuccess);
});

test('applyCurrentStudioVersionListMutationSuccess reuses the shared list-mutation handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioVersionListMutationSuccess(versionContext, options = {}) {',
    '\n\n    function applyCurrentStudioRestoreVersionSuccess(versionContext, options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioVersionActionHandlerOptions() {},
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionListMutationSuccessHandler(options = {}) {
        delegatedArgs = options;
        return (versionContext, nextOptions = {}) => ({
          versionContext,
          createHandlerOptions: typeof options.createHandlerOptions,
          handleVersionListMutationSuccess: typeof options.handleVersionListMutationSuccess,
          onSuccess: nextOptions.onSuccess
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioVersionListMutationSuccess(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      {
        onSuccess: 'success-sentinel'
      }
    ))),
    {
      versionContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      createHandlerOptions: 'function',
      handleVersionListMutationSuccess: 'function',
      onSuccess: 'success-sentinel'
    }
  );
  assert.equal(delegatedArgs.createHandlerOptions, context.createCurrentStudioVersionActionHandlerOptions);
  assert.equal(
    delegatedArgs.handleVersionListMutationSuccess,
    context.SlideNextStudioVersionActions.handleStudioVersionListMutationSuccess
  );
});

test('applyCurrentStudioRestoreVersionSuccess delegates through the shared handler options helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let successArgs = null;
  const onSuccess = () => {};
  const versionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  };
  const context = {
    SlideNextStudioVersionActions: {
      handleStudioRestoreVersionSuccess(nextVersionContext, options) {
        successArgs = [nextVersionContext, options];
        return 'handled';
      }
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        marker: 'version-handler-options',
        ...options
      };
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioRestoreVersionSuccess(fileContent, context);

  const result = context.applyCurrentStudioRestoreVersionSuccess(versionContext, { onSuccess });

  assert.equal(result, 'handled');
  assert.equal(successArgs[0], versionContext);
  assert.equal(successArgs[1].marker, 'version-handler-options');
  assert.equal(successArgs[1].onSuccess, onSuccess);
});

test('applyCurrentStudioRestoreVersionSuccess reuses the shared restore-success handler when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioRestoreVersionSuccess(versionContext, options = {}) {',
    '\n\n    function createCurrentStudioVersionRequestOptions(options = {}) {'
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioVersionActionHandlerOptions() {},
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioRestoreVersionSuccessHandler(options = {}) {
        delegatedArgs = options;
        return (versionContext, nextOptions = {}) => ({
          versionContext,
          createHandlerOptions: typeof options.createHandlerOptions,
          handleRestoreVersionSuccess: typeof options.handleRestoreVersionSuccess,
          onSuccess: nextOptions.onSuccess
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioRestoreVersionSuccess(
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      {
        onSuccess: 'success-sentinel'
      }
    ))),
    {
      versionContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      },
      createHandlerOptions: 'function',
      handleRestoreVersionSuccess: 'function',
      onSuccess: 'success-sentinel'
    }
  );
  assert.equal(delegatedArgs.createHandlerOptions, context.createCurrentStudioVersionActionHandlerOptions);
  assert.equal(
    delegatedArgs.handleRestoreVersionSuccess,
    context.SlideNextStudioVersionActions.handleStudioRestoreVersionSuccess
  );
});

test('createCurrentStudioVersionRequestOptions merges the shared fetch implementation with overrides', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    fetch() {},
    marker: 'context'
  };

  vm.createContext(context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);

  const defaultOptions = context.createCurrentStudioVersionRequestOptions();
  const overrideFetch = () => {};
  const overrideOptions = context.createCurrentStudioVersionRequestOptions({
    fetchImpl: overrideFetch,
    requestId: 'rename'
  });

  assert.equal(defaultOptions.fetchImpl, context.fetch);
  assert.equal(overrideOptions.fetchImpl, overrideFetch);
  assert.equal(overrideOptions.requestId, 'rename');
});

test('createCurrentStudioVersionRequestOptions reuses the shared version-request builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    fetch() {},
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionRequestOptionsBuilder(options = {}) {
        delegatedArgs = options;
        return (nextOptions = {}) => ({
          fetchImpl: typeof options.fetchImpl,
          requestId: nextOptions.requestId
        });
      }
    }
  };

  vm.createContext(context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createCurrentStudioVersionRequestOptions({
      requestId: 'rename'
    }))),
    {
      fetchImpl: 'function',
      requestId: 'rename'
    }
  );
  assert.equal(delegatedArgs.fetchImpl, context.fetch);
});

test('resetStudioVersionUiState hides open version chrome and clears modal state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioVersionUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioVersionUiState(options = {}) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    versionsDropdown: {
      classList: createClassList()
    },
    versionsList: {
      innerHTML: '<div>Old versions</div>'
    },
    saveVersionModal: {
      classList: createClassList(['opacity-100'])
    },
    saveVersionModalContent: {
      classList: createClassList(['scale-100'])
    },
    versionCheckpointName: {
      value: 'Checkpoint A'
    },
    renameVersionModal: {
      classList: createClassList(['opacity-100'])
    },
    renameVersionModalContent: {
      classList: createClassList(['scale-100'])
    },
    newVersionNameInput: {
      value: 'Draft Name'
    },
    confirmRenameVersionBtn: {
      disabled: true,
      textContent: 'Renaming...'
    }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    SlideNextStudioModalVisibility: modalVisibility,
    document: documentStub,
    renamingFilename: 'draft.html',
    renamingVersionContext: { presentationUrl: '/presentations/onboarding-presentation/index.html' }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);
  loadHideCurrentStudioVersionModalImmediately(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  loadResetCurrentStudioRenameVersionState(fileContent, context);
  vm.runInContext(resetStudioVersionUiStateSource, context);

  const saveModalTokenBefore = modalVisibility.getCurrentStudioModalVisibilityToken(elements.saveVersionModal);
  const renameModalTokenBefore = modalVisibility.getCurrentStudioModalVisibilityToken(elements.renameVersionModal);

  context.resetStudioVersionUiState({ isLoading: true });

  assert.equal(elements.versionsDropdown.classList.contains('hidden'), true);
  assert.match(elements.versionsList.innerHTML, /Loading versions\.\.\./);
  assert.equal(elements.versionCheckpointName.value, '');
  assert.equal(elements.saveVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-100'), false);

  assert.equal(context.renamingFilename, '');
  assert.equal(context.renamingVersionContext, null);
  assert.equal(elements.newVersionNameInput.value, '');
  assert.equal(elements.confirmRenameVersionBtn.disabled, false);
  assert.equal(elements.confirmRenameVersionBtn.textContent, 'Rename');
  assert.equal(elements.renameVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-100'), false);

  context.resetStudioVersionUiState();
  assert.match(elements.versionsList.innerHTML, /No versions saved yet/);

  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.saveVersionModal),
    saveModalTokenBefore + 2
  );
  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.renameVersionModal),
    renameModalTokenBefore + 2
  );
});

test('openSaveVersionModal does not open when deck-ready state disables version saves', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const openSaveVersionModalSource = extractFunctionSource(
    fileContent,
    'function openSaveVersionModal() {',
    '\n    \n    function closeSaveVersionModal() {'
  );

  const elements = {
    saveVersionModal: {
      classList: createClassList(['hidden', 'opacity-0']),
      offsetHeight: 0
    },
    saveVersionModalContent: {
      classList: createClassList(['scale-95'])
    },
    versionCheckpointName: {
      value: 'Checkpoint A',
      focusCalls: 0,
      focus() {
        this.focusCalls += 1;
      }
    }
  };

  const context = {
    resolveCurrentStudioDeckReadyActionState() {
      return {
        canUseSaveButton: false
      };
    },
    SlideNextStudioModalVisibility: modalVisibility,
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(openSaveVersionModalSource, context);

  context.openSaveVersionModal();

  assert.equal(elements.saveVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-100'), false);
  assert.equal(elements.versionCheckpointName.value, 'Checkpoint A');
  assert.equal(elements.versionCheckpointName.focusCalls, 0);
});

test('toggleVersionDropdown refreshes version history only when opening the menu', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleVersionDropdownSource = extractFunctionSource(
    fileContent,
    'function toggleVersionDropdown() {',
    '\n\n    function renderVersionsList'
  );

  const loadVersionsCalls = [];
  let canUseDeckActions = true;
  const versionsDropdown = {
    classList: createClassList(['hidden'])
  };
  versionsDropdown.classList.toggle = function toggle(value) {
    if (this.contains(value)) {
      this.remove(value);
      return false;
    }
    this.add(value);
    return true;
  };

  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    resolveCurrentStudioDeckReadyActionState() {
      return {
        canUseDeckActions
      };
    },
    document: {
      getElementById(id) {
        switch (id) {
          case 'versionsDropdown':
            return versionsDropdown;
          default:
            return null;
        }
      }
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    studioEditorSessionToken: 14
  };

  vm.createContext(context);
  vm.runInContext(toggleVersionDropdownSource, context);

  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), false);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);

  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), true);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);

  canUseDeckActions = false;
  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), true);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);
});

test('renderVersionsList delegates version view input assembly to the shared coordinator', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function renderVersionsList(presentationUrl, versions = []) {',
    '\n\n    // Fetch versions checklist'
  );
  const calls = [];
  const context = {
    document: {},
    SlideNextStudioVersionHistory: {
      deriveStudioVersionDeckBaseName(url) {
        calls.push(['deriveStudioVersionDeckBaseName', url]);
        return 'demo';
      }
    },
    VersionBackupUtils: {
      deriveVersionDisplayLabel() {
        return 'label';
      }
    },
    SlideNextStudioVersionView: {
      syncStudioVersionsList(options) {
        calls.push(['syncStudioVersionsList', options]);
        return 'delegated';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  const versions = [{ filename: 'version.html' }];
  assert.equal(context.renderVersionsList('/presentations/demo/index.html', versions), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'syncStudioVersionsList');
  assert.equal(calls[0][1].documentRef, context.document);
  assert.equal(calls[0][1].presentationUrl, '/presentations/demo/index.html');
  assert.deepEqual(calls[0][1].versions, versions);
});

test('promptRenameVersion tolerates a missing rename input', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const promptRenameVersionSource = extractFunctionSource(
    fileContent,
    'function promptRenameVersion(filename, currentLabel) {',
    '\n    \n    function closeRenameVersionModal() {'
  );

  const calls = [];
  const elements = {
    renameVersionModal: {
      classList: createClassList(['hidden'])
    },
    renameVersionModalContent: {
      classList: createClassList(['scale-95'])
    },
    confirmRenameVersionBtn: {
      disabled: true,
      textContent: 'Renaming...'
    }
  };

  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide(modal) {
        calls.push(['cancelStudioModalHide', modal]);
      },
      scheduleStudioModalCallback(modal, options) {
        calls.push(['scheduleStudioModalCallback', modal]);
        options.callback();
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return null;
        }
        return elements[id] || null;
      }
    },
    renamingFilename: '',
    renamingVersionContext: null,
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  loadShowCurrentStudioVersionModal(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  vm.runInContext(promptRenameVersionSource, context);

  assert.doesNotThrow(() => context.promptRenameVersion('index_20260101_120000_Auto.html', 'Draft Name'));
  assert.equal(context.renamingFilename, 'index_20260101_120000_Auto.html');
  assert.equal(context.renamingVersionContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.confirmRenameVersionBtn.disabled, false);
  assert.equal(elements.confirmRenameVersionBtn.textContent, 'Rename');
  assert.equal(elements.renameVersionModal.classList.contains('hidden'), false);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-100'), true);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-95'), false);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-100'), true);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'newVersionNameInput'));
  assert.ok(calls.some(([name]) => name === 'scheduleStudioModalCallback'));
});

test('promptRenameVersion tolerates missing rename modal chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const promptRenameVersionSource = extractFunctionSource(
    fileContent,
    'function promptRenameVersion(filename, currentLabel) {',
    '\n    \n    function closeRenameVersionModal() {'
  );

  const renameInput = {
    value: '',
    focusCalls: 0,
    selectCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
    select() {
      this.selectCalls += 1;
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide() {
        calls.push(['cancelStudioModalHide']);
      },
      scheduleStudioModalCallback() {
        calls.push(['scheduleStudioModalCallback']);
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return renameInput;
        }
        return null;
      }
    },
    renamingFilename: '',
    renamingVersionContext: null,
    studioEditorSessionToken: 22
  };

  vm.createContext(context);
  loadShowCurrentStudioVersionModal(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  vm.runInContext(promptRenameVersionSource, context);

  assert.doesNotThrow(() => context.promptRenameVersion('index_20260101_120000_Auto.html', 'Draft Name'));
  assert.equal(context.renamingFilename, 'index_20260101_120000_Auto.html');
  assert.equal(context.renamingVersionContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(renameInput.value, 'Draft Name');
  assert.equal(renameInput.focusCalls, 0);
  assert.equal(renameInput.selectCalls, 0);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModal'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModalContent'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'confirmRenameVersionBtn'));
  assert.ok(!calls.some(([name]) => name === 'cancelStudioModalHide'));
  assert.ok(!calls.some(([name]) => name === 'scheduleStudioModalCallback'));
});

test('closeRenameVersionModal tolerates missing rename modal nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const closeRenameVersionModalSource = extractFunctionSource(
    fileContent,
    'function closeRenameVersionModal() {',
    '\n    \n    async function submitRenameVersion() {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      scheduleStudioModalHide() {
        calls.push(['scheduleStudioModalHide']);
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  loadHideCurrentStudioVersionModal(fileContent, context);
  vm.runInContext(closeRenameVersionModalSource, context);

  assert.doesNotThrow(() => context.closeRenameVersionModal());
  assert.equal(context.renamingFilename, '');
  assert.equal(context.renamingVersionContext, null);
  assert.deepEqual(calls, [
    ['getElementById', 'renameVersionModal'],
    ['getElementById', 'renameVersionModalContent']
  ]);
});

test('submitRenameVersion no-ops when the rename input is missing', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        calls.push(['getCurrentStudioModalVisibilityToken']);
        return 0;
      },
      isStudioModalVisibilityCurrent() {
        calls.push(['isStudioModalVisibilityCurrent']);
        return true;
      }
    },
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return null;
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
      throw new Error('fetch should not run when the rename input is missing');
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context);
  vm.runInContext(submitRenameVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.submitRenameVersion();
  });
  assert.deepEqual(calls, [
    ['getElementById', 'newVersionNameInput']
  ]);
});

test('submitRenameVersion tolerates missing rename modal chrome during a successful rename', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        calls.push(['getCurrentStudioModalVisibilityToken']);
        return 7;
      },
      createStudioModalVisibilityGuard(modal, visibilityToken) {
        calls.push(['createStudioModalVisibilityGuard', modal, visibilityToken]);
        return () => true;
      },
      isStudioModalVisibilityCurrent() {
        calls.push(['isStudioModalVisibilityCurrent']);
        return true;
      }
    },
    SlideNextStudioVersionActions: {
      async executeStudioRenameVersionRequest(...args) {
        calls.push(['executeStudioRenameVersionRequest', ...args]);
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(renameContext, options) {
        calls.push(['handleStudioVersionListMutationSuccess', renameContext, options.refreshVersionEntries]);
        if (options.isCurrentSession) {
          calls.push(['isCurrentSession', options.isCurrentSession()]);
        }
        if (options.onSuccess) {
          options.onSuccess();
        }
        return true;
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.renamingVersionContext.presentationUrl,
        getCurrentSessionToken: () => null
      };
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return {
            value: 'Draft Name'
          };
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
    },
    loadVersions() {
      calls.push(['loadVersions']);
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context);
  vm.runInContext(submitRenameVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.submitRenameVersion();
  });
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModal'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'confirmRenameVersionBtn'));
  assert.ok(calls.some(([name, , visibilityToken]) => name === 'createStudioModalVisibilityGuard' && visibilityToken === 0));
  assert.ok(calls.some(([name]) => name === 'executeStudioRenameVersionRequest'));
  assert.ok(calls.some(([name, , , , options]) => name === 'executeStudioRenameVersionRequest' && options.fetchImpl === context.fetch));
  assert.ok(calls.some(([name]) => name === 'closeRenameVersionModal'));
  assert.ok(calls.filter(([name]) => name === 'handleStudioVersionListMutationSuccess').length === 2);
  assert.ok(calls.some(([name, result]) => name === 'isCurrentSession' && result === true));
});

test('submitRenameVersion reuses the shared rename request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  let helperArgs = null;
  let readerCallCount = 0;
  const capturedReaders = [];
  const mutationHandlerOptions = [];
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        return 7;
      },
      createStudioModalVisibilityGuard() {
        return () => true;
      },
      isStudioModalVisibilityCurrent() {
        return true;
      }
    },
    SlideNextStudioVersionActions: {
      executeStudioRenameVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(renameContext, options) {
        mutationHandlerOptions.push(options);
        calls.push(['handleStudioVersionListMutationSuccess', renameContext, options.refreshVersionEntries]);
        if (options.onSuccess) {
          options.onSuccess();
        }
        return true;
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
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
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    createCurrentStudioVersionActionContext() {
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        if (id === 'newVersionNameInput') {
          return {
            value: 'Draft Name'
          };
        }
        if (id === 'confirmRenameVersionBtn') {
          return {
            disabled: false,
            textContent: 'Rename'
          };
        }
        return null;
      }
    },
    fetch() {
      throw new Error('submitRenameVersion should pass fetch to the shared rename helper instead of calling it directly');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {
      calls.push(['loadVersions']);
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    },
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context);
  vm.runInContext(submitRenameVersionSource, context);

  await context.submitRenameVersion();

  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.equal(helperArgs[1], 'Draft Name');
  assert.deepEqual(helperArgs[2], {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(helperArgs[3].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 2);
  assert.equal(mutationHandlerOptions.length, 2);
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl, capturedReaders[0].getCurrentPresentationUrl);
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken, capturedReaders[0].getCurrentSessionToken);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl, capturedReaders[1].getCurrentPresentationUrl);
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken, capturedReaders[1].getCurrentSessionToken);
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken(), 21);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken(), 21);
  assert.ok(calls.some(([name]) => name === 'handleStudioVersionListMutationSuccess'));
  assert.ok(calls.some(([name]) => name === 'closeRenameVersionModal'));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 22;
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken(), 22);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken(), 22);
});

test('submitRenameVersion reuses the shared rename request executor when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  let delegatedArgs = null;
  let executorArgs = null;
  const mutationHandlerOptions = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        return 7;
      },
      createStudioModalVisibilityGuard() {
        return () => true;
      },
      isStudioModalVisibilityCurrent() {
        return true;
      }
    },
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioRenameVersionRequestExecutor(options = {}) {
        delegatedArgs = options;
        return async (versionFilename, newLabel, renameContext) => {
          executorArgs = [versionFilename, newLabel, renameContext];
          return { success: true };
        };
      },
      handleStudioVersionListMutationSuccess(renameContext, options) {
        mutationHandlerOptions.push(options);
        if (options.onSuccess) {
          options.onSuccess();
        }
        return true;
      }
    },
    closeRenameVersionModal() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    createCurrentStudioVersionActionContext() {
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    createCurrentStudioVersionRequestOptions() {
      return { fetchImpl: context.fetch };
    },
    document: {
      getElementById(id) {
        if (id === 'newVersionNameInput') {
          return {
            value: 'Draft Name'
          };
        }
        if (id === 'confirmRenameVersionBtn') {
          return {
            disabled: false,
            textContent: 'Rename'
          };
        }
        return null;
      }
    },
    fetch() {},
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {},
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    },
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  loadResetCurrentStudioRenameVersionButtonState(fileContent, context);
  loadSetCurrentStudioRenameVersionButtonBusyState(fileContent, context);
  vm.runInContext(submitRenameVersionSource, context);

  await context.submitRenameVersion();

  assert.equal(executorArgs[0], 'index_20260101_120000_Auto.html');
  assert.equal(executorArgs[1], 'Draft Name');
  assert.deepEqual(executorArgs[2], {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(delegatedArgs.createVersionRequestOptions, context.createCurrentStudioVersionRequestOptions);
  assert.equal(
    delegatedArgs.executeRenameVersionRequest,
    context.SlideNextStudioVersionActions.executeStudioRenameVersionRequest
  );
  assert.equal(mutationHandlerOptions.length, 2);
});

test('deleteVersion reuses the shared delete request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteVersionSource = extractFunctionSource(
    fileContent,
    'async function deleteVersion(filename) {',
    '\n\n    // Slide Elements / Layers List Inspector Panel'
  );

  let helperArgs = null;
  let builderArgs = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  let successOptions = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        builderArgs = [presentationUrl, presentationTitle, presentationCategory, options];
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      executeStudioDeleteVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(deleteContext, options) {
        successOptions = options;
        calls.push(['handleStudioVersionListMutationSuccess', deleteContext, options.refreshVersionEntries]);
        return true;
      }
    },
    alert() {
      throw new Error('deleteVersion should not alert on a successful shared helper result');
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    fetch() {
      throw new Error('deleteVersion should pass fetch to the shared delete helper instead of calling it directly');
    },
    loadVersions() {
      calls.push(['loadVersions']);
    },
    studioEditorSessionToken: 17
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  vm.runInContext(deleteVersionSource, context);

  await context.deleteVersion('index_20260101_120000_Auto.html');

  assert.equal(builderArgs[0], '/presentations/onboarding-presentation/index.html');
  assert.equal(builderArgs[1], 'Project Onboarding');
  assert.equal(builderArgs[2], 'General');
  assert.equal(builderArgs[3].sessionToken, 17);
  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 17
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 1);
  assert.equal(successOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 17);
  assert.ok(calls.some(([name]) => name === 'handleStudioVersionListMutationSuccess'));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 18;
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 18);
});

test('deleteVersion reuses the shared delete request executor when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteVersionSource = extractFunctionSource(
    fileContent,
    'async function deleteVersion(filename) {',
    '\n\n    // Slide Elements / Layers List Inspector Panel'
  );

  let delegatedArgs = null;
  let executorArgs = null;
  let successOptions = null;
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioDeleteVersionRequestExecutor(options = {}) {
        delegatedArgs = options;
        return async (versionFilename, deleteContext) => {
          executorArgs = [versionFilename, deleteContext];
          return { success: true };
        };
      },
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      handleStudioVersionListMutationSuccess(deleteContext, options) {
        successOptions = options;
        return true;
      }
    },
    alert() {
      throw new Error('deleteVersion should not alert on a successful executor result');
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    createCurrentStudioVersionRequestOptions() {
      return { fetchImpl: context.fetch };
    },
    fetch() {},
    loadVersions() {},
    studioEditorSessionToken: 17
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioVersionListMutationSuccess(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  vm.runInContext(deleteVersionSource, context);

  await context.deleteVersion('index_20260101_120000_Auto.html');

  assert.equal(executorArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(executorArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 17
  });
  assert.equal(delegatedArgs.createVersionRequestOptions, context.createCurrentStudioVersionRequestOptions);
  assert.equal(
    delegatedArgs.executeDeleteVersionRequest,
    context.SlideNextStudioVersionActions.executeStudioDeleteVersionRequest
  );
  assert.equal(successOptions.refreshVersionEntries, context.loadVersions);
});

test('restoreVersion tolerates a missing versions dropdown after a successful restore', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreVersionSource = extractFunctionSource(
    fileContent,
    'async function restoreVersion(filename) {',
    '\n\n    function promptRenameVersion(filename, currentLabel) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        calls.push(['createStudioVersionActionContext', presentationUrl, presentationTitle, presentationCategory, options]);
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      async executeStudioRestoreVersionRequest(...args) {
        calls.push(['executeStudioRestoreVersionRequest', ...args]);
        return { success: true };
      },
      handleStudioRestoreVersionSuccess(restoreContext, options) {
        calls.push(['handleStudioRestoreVersionSuccess', restoreContext, options]);
        options.hideVersionsDropdown();
        options.onSuccess();
        return true;
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm(message) {
      calls.push(['confirm', message]);
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'versionsDropdown') {
          return null;
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
    },
    handleCurrentStudioVersionActionFailure() {
      calls.push(['handleCurrentStudioVersionActionFailure']);
    },
    launchStudioEditor(presentationUrl, presentationTitle, presentationCategory) {
      calls.push(['launchStudioEditor', presentationUrl, presentationTitle, presentationCategory]);
    },
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioRestoreVersionSuccess(fileContent, context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  vm.runInContext(restoreVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.restoreVersion('index_20260101_120000_Auto.html');
  });
  assert.ok(calls.some(([name]) => name === 'executeStudioRestoreVersionRequest'));
  assert.ok(calls.some(([name, , , options]) => name === 'executeStudioRestoreVersionRequest' && options.fetchImpl === context.fetch));
  assert.ok(calls.some(([name]) => name === 'createStudioVersionActionContext'));
  assert.ok(calls.some(([name]) => name === 'handleStudioRestoreVersionSuccess'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'versionsDropdown'));
  assert.ok(calls.some(([name, message]) => name === 'alert' && /Rollback successfully restored!/.test(message)));
  assert.ok(!calls.some(([name]) => name === 'handleCurrentStudioVersionActionFailure'));
});

test('restoreVersion reuses the shared restore request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreVersionSource = extractFunctionSource(
    fileContent,
    'async function restoreVersion(filename) {',
    '\n\n    function promptRenameVersion(filename, currentLabel) {'
  );

  let helperArgs = null;
  let builderArgs = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  let successOptions = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        builderArgs = [presentationUrl, presentationTitle, presentationCategory, options];
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      executeStudioRestoreVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioRestoreVersionSuccess(restoreContext, options) {
        successOptions = options;
        calls.push(['handleStudioRestoreVersionSuccess', restoreContext, options]);
        options.hideVersionsDropdown();
        options.onSuccess();
        return true;
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    fetch() {
      throw new Error('restoreVersion should pass fetch to the shared restore helper instead of calling it directly');
    },
    document: {
      getElementById(id) {
        if (id === 'versionsDropdown') {
          return {
            classList: {
              add() {}
            }
          };
        }
        return null;
      }
    },
    handleCurrentStudioVersionActionFailure() {
      throw new Error('restoreVersion should not use the failure handler for a successful shared helper result');
    },
    launchStudioEditor() {},
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioRestoreVersionSuccess(fileContent, context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  vm.runInContext(restoreVersionSource, context);

  await context.restoreVersion('index_20260101_120000_Auto.html');

  assert.equal(builderArgs[0], '/presentations/onboarding-presentation/index.html');
  assert.equal(builderArgs[1], 'Project Onboarding');
  assert.equal(builderArgs[2], 'General');
  assert.equal(builderArgs[3].sessionToken, 13);
  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 13
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 1);
  assert.equal(successOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 13);
  assert.ok(calls.some(([name]) => name === 'handleStudioRestoreVersionSuccess'));
  assert.ok(calls.some(([name, message]) => name === 'alert' && /Rollback successfully restored!/.test(message)));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 14;
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 14);
});

test('restoreVersion reuses the shared restore request executor when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreVersionSource = extractFunctionSource(
    fileContent,
    'async function restoreVersion(filename) {',
    '\n\n    function promptRenameVersion(filename, currentLabel) {'
  );

  let delegatedArgs = null;
  let executorArgs = null;
  let successOptions = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioRestoreVersionRequestExecutor(options = {}) {
        delegatedArgs = options;
        return async (versionFilename, restoreContext) => {
          executorArgs = [versionFilename, restoreContext];
          return { success: true };
        };
      },
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      handleStudioRestoreVersionSuccess(restoreContext, options) {
        successOptions = options;
        calls.push(['handleStudioRestoreVersionSuccess', restoreContext, options]);
        return true;
      }
    },
    alert() {
      throw new Error('restoreVersion should not alert on a successful executor result');
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    createCurrentStudioVersionActionHandlerOptions(options = {}) {
      return {
        ...context.createCurrentStudioSessionStateReaders(),
        ...options
      };
    },
    createCurrentStudioVersionRequestOptions() {
      return { fetchImpl: context.fetch };
    },
    document: {
      getElementById() {
        return null;
      }
    },
    fetch() {},
    hideCurrentStudioVersionsDropdown() {},
    launchStudioEditor() {},
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  loadApplyCurrentStudioVersionActionFailure(fileContent, context);
  loadApplyCurrentStudioRestoreVersionSuccess(fileContent, context);
  loadHideCurrentStudioVersionsDropdown(fileContent, context);
  loadCreateCurrentStudioVersionRequestOptions(fileContent, context);
  vm.runInContext(restoreVersionSource, context);

  await context.restoreVersion('index_20260101_120000_Auto.html');

  assert.equal(executorArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(executorArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 13
  });
  assert.equal(delegatedArgs.createVersionRequestOptions, context.createCurrentStudioVersionRequestOptions);
  assert.equal(
    delegatedArgs.executeRestoreVersionRequest,
    context.SlideNextStudioVersionActions.executeStudioRestoreVersionRequest
  );
  assert.equal(typeof successOptions.hideVersionsDropdown, 'function');
});

test('createCurrentStudioVersionHistoryLoadOptions merges live session readers with version list refresh behavior', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionHistoryLoadOptions(',
    '\n\n    async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {'
  );

  let readerCallCount = 0;
  let capturedReaders = null;
  const context = {
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    renderVersionsListCalls: [],
    renderVersionsList(presentationUrl, versions) {
      context.renderVersionsListCalls.push([presentationUrl, versions]);
    },
    studioEditorSessionToken: 18
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);

  const loadOptions = context.createCurrentStudioVersionHistoryLoadOptions(
    '/presentations/onboarding-presentation/index.html',
    18
  );

  assert.equal(readerCallCount, 1);
  assert.equal(loadOptions.sessionToken, 18);
  assert.equal(loadOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(loadOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(loadOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(loadOptions.getCurrentSessionToken(), 18);
  loadOptions.commitVersionEntries([
    {
      filename: 'index_20260101_120000_Auto.html',
      createdAt: '2026-01-01T12:00:00.000Z'
    }
  ]);
  assert.deepEqual(context.renderVersionsListCalls, [[
    '/presentations/onboarding-presentation/index.html',
    [
      {
        filename: 'index_20260101_120000_Auto.html',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ]
  ]]);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 19;
  assert.equal(loadOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(loadOptions.getCurrentSessionToken(), 19);
});

test('createCurrentStudioVersionHistoryLoadOptions reuses the shared version-history builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionHistoryLoadOptions(',
    '\n\n    async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {'
  );

  let delegatedArgs = null;
  const context = {
    createCurrentStudioSessionReaderOptions() {},
    renderVersionsList() {},
    SlideNextStudioVersionHistory: {
      createStudioVersionHistoryLoadOptionsBuilder(options = {}) {
        delegatedArgs = options;
        return (presentationUrl, sessionToken) => ({
          presentationUrl,
          sessionToken,
          createSessionReaderOptions: typeof options.createSessionReaderOptions,
          renderVersionEntries: typeof options.renderVersionEntries
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createCurrentStudioVersionHistoryLoadOptions(
      '/presentations/onboarding-presentation/index.html',
      18
    ))),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 18,
      createSessionReaderOptions: 'function',
      renderVersionEntries: 'function'
    }
  );
  assert.equal(delegatedArgs.createSessionReaderOptions, context.createCurrentStudioSessionReaderOptions);
  assert.equal(delegatedArgs.renderVersionEntries, context.renderVersionsList);
});

test('loadVersions reuses the shared session reader helper when delegating to the version history loader', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionHistoryLoadOptions(',
    '\n\n    async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {'
  );
  const loadVersionsSource = extractFunctionSource(
    fileContent,
    'async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // Rollback backup version'
  );

  let capturedOptions = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  const errorCalls = [];
  const context = {
    SlideNextStudioVersionHistory: {
      async loadStudioVersionHistory(presentationUrl, options) {
        capturedOptions = options;
        const versions = [
          {
            filename: 'index_20260101_120000_Auto.html',
            createdAt: '2026-01-01T12:00:00.000Z'
          }
        ];
        options.commitVersionEntries(versions);
        return versions;
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
    console: {
      error(...args) {
        errorCalls.push(args);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    renderVersionsListCalls: [],
    renderVersionsList(presentationUrl, versions) {
      context.renderVersionsListCalls.push([presentationUrl, versions]);
    },
    studioEditorSessionToken: 18
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);
  vm.runInContext(loadVersionsSource, context);

  await context.loadVersions(
    '/presentations/onboarding-presentation/index.html',
    18
  );

  assert.equal(readerCallCount, 1);
  assert.equal(capturedOptions.sessionToken, 18);
  assert.equal(capturedOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(typeof capturedOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 18);
  assert.deepEqual(context.renderVersionsListCalls, [[
    '/presentations/onboarding-presentation/index.html',
    [
      {
        filename: 'index_20260101_120000_Auto.html',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ]
  ]]);
  assert.deepEqual(errorCalls, []);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 19;
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 19);
});

test('loadVersions reuses the shared version-history loader when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionHistoryLoadOptions(',
    '\n\n    async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {'
  );
  const loadVersionsSource = extractFunctionSource(
    fileContent,
    'async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // Rollback backup version'
  );

  let delegatedArgs = null;
  const context = {
    console: {
      error() {}
    },
    createCurrentStudioVersionHistoryLoadOptions() {},
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 18,
    SlideNextStudioVersionHistory: {
      ...versionHistory,
      createStudioVersionHistoryLoader(options = {}) {
        delegatedArgs = options;
        return async (presentationUrl, sessionToken) => ({
          presentationUrl,
          sessionToken,
          createLoadOptions: typeof options.createLoadOptions,
          loadVersionHistory: typeof options.loadVersionHistory,
          reportLoadError: typeof options.reportLoadError
        });
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);
  vm.runInContext(loadVersionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(await context.loadVersions(
      '/presentations/onboarding-presentation/index.html',
      18
    ))),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 18,
      createLoadOptions: 'function',
      loadVersionHistory: 'function',
      reportLoadError: 'function'
    }
  );
  assert.equal(delegatedArgs.getPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.getSessionToken(), 18);
  assert.equal(delegatedArgs.createLoadOptions, context.createCurrentStudioVersionHistoryLoadOptions);
  assert.equal(delegatedArgs.loadVersionHistory, context.SlideNextStudioVersionHistory.loadStudioVersionHistory);
});

test('createCurrentStudioSessionStateReaders exposes live presentation and session getters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let capturedAdapterOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioEditorSessionStateReadersAdapter(options) {
        capturedAdapterOptions = options;
        return editorSession.createStudioSessionStateReaders(options);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);

  const options = context.createCurrentStudioSessionStateReaders();
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 4);
  assert.equal(capturedAdapterOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedAdapterOptions.getCurrentSessionToken(), 4);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 5);
  assert.equal(capturedAdapterOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedAdapterOptions.getCurrentSessionToken(), 5);
});
