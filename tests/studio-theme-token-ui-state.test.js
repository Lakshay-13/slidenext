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

function loadFunction(fileContent, startMarker, endMarker, context) {
  vm.createContext(context);
  vm.runInContext(extractFunctionSource(fileContent, startMarker, endMarker), context);
  return context;
}

test('applyThemeTokenPreset mirrors and persists a ready deck theme preset', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck' };
  const calls = [];
  const context = {
    themeTokenPresetsData: {
      aurora: { name: 'Aurora Glass', tokens: { '--color-primary': '#5eead4' } }
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    SlideNextStudioEditorCanonicalTheme: {
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
    SlideNextCanonicalDeck: {},
    buildEditorCanonicalDeck(doc) {
      calls.push(['baseline', doc]);
      return { kind: 'slidenext.deck', theme: { tokens: {} } };
    },
    finalizeEditorDeckMutation(versionLabel, options) {
      calls.push(['finalize', versionLabel, options]);
      return versionLabel;
    },
    updateThemeTokenActionState(doc) {
      calls.push(['sync', doc]);
    }
  };
  loadFunction(fileContent, 'function applyThemeTokenPreset(presetId) {', '\n\n    function setCustomGradientType', context);

  assert.equal(context.applyThemeTokenPreset('aurora'), true);
  assert.deepEqual(calls.map(([name]) => name), ['baseline-helper', 'baseline', 'build', 'apply', 'finalize', 'sync']);
  assert.equal(typeof calls[0][1].getCanonicalDeckBaseline, 'function');
  assert.equal(calls[4][1], 'Auto: Applied Aurora Glass Theme');
  assert.equal(calls[4][2].canonicalDeck, canonicalDeck);
});

test('applyThemeTokenPreset refuses unavailable decks without mutating state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let applyCalls = 0;
  const context = {
    themeTokenPresetsData: { aurora: { name: 'Aurora', tokens: { '--color-primary': 'red' } } },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    },
    getIframeDoc() {
      throw new Error('iframe should not be requested');
    },
    SlideNextStudioEditorCanonicalTheme: {
      applyStudioCanonicalThemeTokenUpdates() {
        applyCalls += 1;
        return true;
      }
    }
  };
  loadFunction(fileContent, 'function applyThemeTokenPreset(presetId) {', '\n\n    function setCustomGradientType', context);

  assert.equal(context.applyThemeTokenPreset('aurora'), false);
  assert.equal(applyCalls, 0);
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
