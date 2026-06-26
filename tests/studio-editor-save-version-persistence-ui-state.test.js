const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('setCurrentPresentationCanonicalDeck normalizes valid deck-like metadata updates for the active presentation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = currentPresentationUrl, presentationTitle = currentTitle) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  const context = {
    SlideNextStudioDeckContext: require('../shared/studio-deck-context.js'),
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: null,
    buildCurrentPresentationMetadataSeed(presentationUrl, presentationTitle) {
      return {
        id: 'onboarding-presentation',
        title: presentationTitle,
        sourcePath: presentationUrl
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.deepEqual(context.currentPresentationMetadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    })
  });
});

test('saveVersionCheckpoint refreshes persisted html and canonical metadata after a successful save rewrite', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchCalls = [];
  const canonicalDeckUpdates = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4,
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    isCurrentDeckStatePersisted() {
      return false;
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      canonicalDeckUpdates.push([nextCanonicalDeck, presentationUrl]);
    }
  };

  vm.createContext(context);
  vm.runInContext(saveVersionCheckpointSource, context);

  const result = await context.saveVersionCheckpoint(
    'Checkpoint A',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 4,
      doc: { label: 'iframe-doc' }
    }
  );

  assert.deepEqual(result, { success: true });
  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint A',
      canonicalDeck
    }
  ]]);
  assert.equal(context.lastPersistedDeckHtml, '<html>persisted</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, canonicalDeckModel.createCanonicalDeck(canonicalDeck));
  assert.deepEqual(canonicalDeckUpdates, [[
    canonicalDeckModel.createCanonicalDeck(canonicalDeck),
    'presentations/onboarding-presentation/index.html'
  ]]);
});

test('saveVersionCheckpoint keeps save rewrites enabled when canonical state changed despite matching persisted html', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const currentCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: [
          {
            id: 'node-1',
            type: 'html'
          }
        ]
      }
    ]
  };
  const persistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck({
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  });
  const fetchCalls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 7,
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    isCurrentDeckStatePersisted(saveRequestBody, cleanHtml) {
      return editorPersistence.isStudioPersistedState(cleanHtml, saveRequestBody && saveRequestBody.canonicalDeck, {
        persistedHtml: context.lastPersistedDeckHtml,
        persistedCanonicalDeck: context.lastPersistedCanonicalDeck
      });
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck: currentCanonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck() {}
  };

  vm.createContext(context);
  vm.runInContext(saveVersionCheckpointSource, context);

  await context.saveVersionCheckpoint(
    'Checkpoint B',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 7,
      doc: { label: 'iframe-doc' }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint B',
      canonicalDeck: currentCanonicalDeck
    }
  ]]);
});
