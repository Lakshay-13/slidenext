const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('launchStudioEditor shows a loading autosave status until the iframe deck finishes bootstrapping', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchStudioEditorSource = extractFunctionSource(
    fileContent,
    'function launchStudioEditor(url, title, category) {',
    '\n\n    function closeStudioEditor() {'
  );
  const setStudioAutoSaveStatusSource = extractFunctionSource(
    fileContent,
    'function setStudioAutoSaveStatus(state) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    studioEditor: {
      classList: createClassList(['hidden']),
      style: {},
      offsetWidth: 0
    },
    studioFrame: {
      onload: null,
      src: '',
      contentDocument: null,
      contentWindow: {}
    },
    studioCategoryLabel: { textContent: '' },
    studioTitleLabel: { textContent: '' },
    autoSaveStatus: { innerHTML: 'Saved to disk' }
  };

  const loadVersionsCalls = [];
  let capturedFrameLoadOptions = null;
  const currentStudioSessionStateReaders = {
    getCurrentPresentationUrl() {
      return context.currentPresentationUrl;
    },
    getCurrentSessionToken() {
      return context.studioEditorSessionToken;
    }
  };
  const context = {
    SlideNextStudioEditorSession: {
      createStudioFrameLoadHandler(options) {
        capturedFrameLoadOptions = options;
        return function onloadHandler() {};
      }
    },
    applyEditorSelectionState() {},
    buildCurrentPresentationMetadataSeed(url, title) {
      return { url, title };
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentCategory: '',
    currentPresentationMetadata: null,
    currentPresentationUrl: '',
    currentSlideIndex: 0,
    currentTitle: '',
    getStudioFrame() {
      return elements.studioFrame;
    },
    document: {
      body: {
        style: {}
      },
      getElementById(id) {
        return elements[id] || null;
      }
    },
    loadCurrentPresentationMetadata() {
      return Promise.resolve();
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    localStorage: {
      getItem() {
        return null;
      }
    },
    resetEditorDeckPersistenceState() {},
    resetEditorHistoryState() {},
    resetEditorPersistenceTimers() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout,
    studioEditorSessionToken: 0,
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');

  assert.match(elements.autoSaveStatus.innerHTML, /Loading deck/);
  assert.equal(elements.studioCategoryLabel.textContent, 'General');
  assert.equal(elements.studioTitleLabel.textContent, 'Project Onboarding');
  assert.equal(elements.studioFrame.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.studioEditor.classList.contains('active'), true);
  assert.equal(capturedFrameLoadOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedFrameLoadOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    1
  ]]);
});

test('closeStudioEditor reuses the shared frame accessor before clearing the editor shell state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const closeStudioEditorSource = extractFunctionSource(
    fileContent,
    'function closeStudioEditor() {',
    '\n\n    // Initialize Frame Hooks'
  );

  const studioFrame = {
    onload: function existingHandler() {},
    src: '/presentations/onboarding-presentation/index.html'
  };
  const studioEditor = {
    classList: createClassList(['active']),
    style: {
      opacity: '1',
      pointerEvents: 'auto'
    }
  };
  let getStudioFrameCalls = 0;
  let loadPresentationsCalls = 0;

  const context = {
    currentCategory: 'General',
    currentPresentationMetadata: { id: 'deck-1' },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 2,
    currentTitle: 'Project Onboarding',
    deselectElement() {},
    document: {
      body: {
        style: {
          overflow: 'hidden'
        }
      },
      getElementById(id) {
        if (id === 'studioEditor') return studioEditor;
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    getStudioFrame() {
      getStudioFrameCalls += 1;
      return studioFrame;
    },
    loadPresentations() {
      loadPresentationsCalls += 1;
    },
    resetEditorDeckPersistenceState() {},
    resetEditorHistoryState() {},
    resetEditorPersistenceTimers() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    studioEditorSessionToken: 4,
    teardownDeckActiveSlideSync() {},
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(closeStudioEditorSource, context);

  context.closeStudioEditor();

  assert.equal(getStudioFrameCalls, 1);
  assert.equal(studioFrame.onload, null);
  assert.equal(studioFrame.src, '');
  assert.equal(studioEditor.classList.contains('active'), false);
  assert.equal(studioEditor.classList.contains('hidden'), true);
  assert.equal(studioEditor.style.opacity, '0');
  assert.equal(studioEditor.style.pointerEvents, 'none');
  assert.equal(context.currentPresentationUrl, '');
  assert.equal(context.currentTitle, '');
  assert.equal(context.currentCategory, '');
  assert.equal(context.currentSlideIndex, 0);
  assert.equal(context.currentPresentationMetadata, null);
  assert.equal(context.studioEditorSessionToken, 5);
  assert.equal(context.document.body.style.overflow, '');
  assert.equal(loadPresentationsCalls, 1);
});

test('loadCurrentPresentationMetadata reuses current session readers when delegating to the deck context', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  let capturedOptions = null;
  const currentStudioSessionStateReaders = {
    getCurrentPresentationUrl() {
      return context.currentPresentationUrl;
    },
    getCurrentSessionToken() {
      return context.studioEditorSessionToken;
    }
  };
  const context = {
    SlideNextStudioDeckContext: {
      async loadStudioPresentationMetadata(presentationUrl, presentationTitle, options) {
        capturedOptions = options;
        options.setCurrentPresentationMetadata({
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl
        });
        return {
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl
        };
      },
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(capturedOptions.sessionToken, 12);
  assert.equal(capturedOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.deepEqual(context.currentPresentationMetadata, metadata);
});

test('loadCurrentPresentationMetadata refreshes the persisted canonical baseline from stored metadata sidecars', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  const resolvedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchedMetadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Project Onboarding'
      },
      slides: []
    }
  };

  const context = {
    SlideNextStudioDeckContext: {
      async loadStudioPresentationMetadata(presentationUrl, presentationTitle, options) {
        options.setCurrentPresentationMetadata(fetchedMetadata);
        return fetchedMetadata;
      },
      resolveStoredStudioCanonicalDeck(metadata) {
        assert.equal(metadata, fetchedMetadata);
        return resolvedCanonicalDeck;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    lastPersistedCanonicalDeck: null,
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.equal(metadata, fetchedMetadata);
  assert.equal(context.currentPresentationMetadata, fetchedMetadata);
  assert.equal(context.lastPersistedCanonicalDeck, resolvedCanonicalDeck);
});
