const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const themeView = require('../shared/studio-editor-theme-view.js');
const themePresetController = require('../shared/studio-editor-theme-preset-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadFunction(fileContent, startMarker, endMarker, context) {
  vm.createContext(context);
  vm.runInContext(extractFunctionSource(fileContent, startMarker, endMarker), context);
  return context;
}

test('applyStudioThemeTokenPreset mirrors and persists a ready deck theme preset', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck' };
  const calls = [];
  const result = themePresetController.applyStudioThemeTokenPreset({
    presetId: 'aurora',
    presetData: {
      aurora: { name: 'Aurora Glass', tokens: { '--color-primary': '#5eead4' } }
    },
    resolveReadyState() {
      return { canUseDeckActions: true };
    },
    getIframeDocument() {
      return iframeDoc;
    },
    canonicalThemeApi: {
      buildStudioCanonicalThemeBaseline(options) {
        calls.push(['baseline-helper', options]);
        return options.buildCanonicalDeckBaseline(options.sourceDocument);
      },
      buildStudioCanonicalThemeDeck(tokens, options) {
        calls.push(['build', tokens, options]);
        return canonicalDeck;
      },
      applyStudioCanonicalThemeTokenUpdates(doc, tokens) {
        calls.push(['apply', doc, tokens]);
        return true;
      }
    },
    canonicalDeckApi: {},
    getCanonicalDeckBaseline() {
      return null;
    },
    buildCanonicalDeckBaseline(doc) {
      calls.push(['baseline', doc]);
      return { kind: 'slidenext.deck', theme: { tokens: {} } };
    },
    finalizeMutation(versionLabel, options) {
      calls.push(['finalize', versionLabel, options]);
      return versionLabel;
    },
    updateActionState(doc) {
      calls.push(['sync', doc]);
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls.map(([name]) => name), ['baseline-helper', 'baseline', 'build', 'apply', 'finalize', 'sync']);
  assert.equal(typeof calls[0][1].getCanonicalDeckBaseline, 'function');
  assert.equal(calls[4][1], 'Auto: Applied Aurora Glass Theme');
  assert.equal(calls[4][2].canonicalDeck, canonicalDeck);
});

test('applyStudioThemeTokenPreset refuses unavailable decks without mutating state', () => {
  let applyCalls = 0;
  const result = themePresetController.applyStudioThemeTokenPreset({
    presetId: 'aurora',
    presetData: { aurora: { name: 'Aurora', tokens: { '--color-primary': 'red' } } },
    resolveReadyState() {
      return { canUseDeckActions: false };
    },
    getIframeDocument() {
      throw new Error('iframe should not be requested');
    },
    canonicalThemeApi: {
      applyStudioCanonicalThemeTokenUpdates() {
        applyCalls += 1;
        return true;
      }
    }
  });

  assert.equal(result, false);
  assert.equal(applyCalls, 0);
});

test('applyStudioThemeTokenPreset restores CSS tokens when persistence rejects', () => {
  const values = { '--color-primary': 'blue' };
  const iframeDoc = {
    documentElement: {
      style: {
        getPropertyValue(name) {
          return values[name] || '';
        },
        setProperty(name, value) {
          values[name] = value;
        },
        removeProperty(name) {
          delete values[name];
        }
      }
    }
  };
  const canonicalThemeApi = {
    buildStudioCanonicalThemeBaseline: () => ({ kind: 'slidenext.deck', slides: [] }),
    buildStudioCanonicalThemeDeck: () => ({ kind: 'slidenext.deck', slides: [] }),
    applyStudioCanonicalThemeTokenUpdates(documentRef, tokenUpdates) {
      Object.entries(tokenUpdates).forEach(([name, value]) => {
        if (value) documentRef.documentElement.style.setProperty(name, value);
        else documentRef.documentElement.style.removeProperty(name);
      });
      return true;
    }
  };

  assert.equal(themePresetController.applyStudioThemeTokenPreset({
    presetId: 'aurora',
    presetData: {
      aurora: { name: 'Aurora', tokens: { '--color-primary': 'green' } }
    },
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getIframeDocument: () => iframeDoc,
    canonicalThemeApi,
    canonicalDeckApi: {},
    finalizeMutation: () => false
  }), false);
  assert.equal(values['--color-primary'], 'blue');
});

test('applyStudioThemeTokenPreset fails closed when canonical setup throws', () => {
  let applyCalls = 0;
  const result = themePresetController.applyStudioThemeTokenPreset({
    presetId: 'aurora',
    presetData: { aurora: { name: 'Aurora', tokens: { '--color-primary': 'red' } } },
    resolveReadyState() {
      return { canUseDeckActions: true };
    },
    getIframeDocument() {
      return { id: 'iframe-doc' };
    },
    canonicalThemeApi: {
      buildStudioCanonicalThemeBaseline() {
        throw new Error('canonical theme baseline unavailable');
      },
      applyStudioCanonicalThemeTokenUpdates() {
        applyCalls += 1;
        return true;
      }
    },
    canonicalDeckApi: {}
  });

  assert.equal(result, false);
  assert.equal(applyCalls, 0);
});

test('index routes theme-token mutations through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-theme-preset-controller\.js"/);
  assert.match(source, /themePresetController\.applyStudioThemeTokenPreset/);
  assert.match(
    source,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc \|\| getIframeDoc\(\), buildOptions\)/
  );
});

test('renderThemeTokenPresets forwards readiness to the shared theme view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    themeTokenPresetsData: { aurora: { name: 'Aurora', tokens: {} } },
    SlideNextStudioEditorThemeView: {
      renderStudioThemeTokenPresets(options) {
        calls.push(options);
        return 'rendered';
      }
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    },
    document: { id: 'chrome-document' }
  };
  loadFunction(fileContent, 'function renderThemeTokenPresets() {', '\n\n    function finalizeWallpaperMutation', context);

  assert.equal(context.renderThemeTokenPresets(), 'rendered');
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].canUseThemeTokenControls, false);
});

test('updateThemeTokenActionState delegates deck readiness to the shared theme view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const iframeDoc = { id: 'iframe-doc' };
  const context = {
    SlideNextStudioEditorThemeView: {
      syncStudioThemeTokenPresetActionState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    studioEditorDeckReadyController: {
      resolve(doc) {
        calls.push(['ready', doc]);
        return { canUseDeckActions: true };
      }
    },
    document: { id: 'chrome-document' },
    getIframeDoc() {
      return iframeDoc;
    }
  };
  loadFunction(fileContent, 'function updateThemeTokenActionState(doc = getIframeDoc()) {', '\n\n    function updateDeckReadyToolbarActionState', context);

  assert.equal(context.updateThemeTokenActionState(), 'synced');
  assert.deepEqual(calls[0], ['ready', iframeDoc]);
  assert.equal(calls[1].documentRef, context.document);
  assert.equal(calls[1].canUseThemeTokenControls, true);
});

test('createStudioThemeTokenPresetActionStateSync resolves theme readiness through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const buttons = [{ disabled: true }];
  const calls = [];
  const syncState = themeView.createStudioThemeTokenPresetActionStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { canUseThemeTokenControls: true };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return id === 'themeTokenPresetsList'
            ? { querySelectorAll: () => buttons }
            : null;
        }
      };
    }
  });

  assert.equal(syncState(), true);
  assert.equal(buttons[0].disabled, false);
  assert.deepEqual(calls, [
    'document',
    ['action-state', doc],
    'document-ref'
  ]);
});

test('createStudioThemeTokenPresetActionStateSync fails closed when theme readiness resolution throws', () => {
  const syncState = themeView.createStudioThemeTokenPresetActionStateSync({
    getActionState() {
      throw new Error('theme state unavailable');
    }
  });

  assert.equal(syncState(), false);
});

test('updateThemeTokenActionState caches the shared theme synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateThemeTokenActionState(doc = getIframeDoc()) {',
    '\n\n    function resolveCurrentStudioDeckReadyActionState(doc = getIframeDoc()) {'
  );
  const doc = { id: 'active-doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorThemeView: {
      syncStudioThemeTokenPresetActionState() {
        throw new Error('direct theme sync should not run');
      },
      createStudioThemeTokenPresetActionStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canUseThemeTokenControls;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateThemeTokenActionState(doc), true);
  assert.equal(context.updateThemeTokenActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});
