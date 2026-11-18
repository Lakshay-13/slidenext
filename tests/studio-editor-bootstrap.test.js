const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bootstrapApi = require('../shared/studio-editor-bootstrap.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function createBootstrapFixture() {
  const calls = [];
  const listeners = {
    document: {},
    window: {},
    canvas: {}
  };
  const elements = {
    themeIcon: { textContent: '' },
    themeIconEditor: { textContent: '' },
    zoomSelect: { value: 'fit' },
    canvasStage: {
      addEventListener(type, handler) {
        listeners.canvas[type] = handler;
      }
    }
  };
  const documentRef = {
    addEventListener(type, handler) {
      listeners.document[type] = handler;
    },
    getElementById(id) {
      return elements[id] || null;
    }
  };
  const windowRef = {
    addEventListener(type, handler) {
      listeners.window[type] = handler;
    }
  };
  const callbackNames = [
    'loadPresentations',
    'renderWallpaperPresets',
    'renderThemeTokenPresets',
    'updateWallpaperActionState',
    'updateThemeTokenActionState',
    'updateGridSnapActionState',
    'updateDeckReadyToolbarActionState',
    'updateBlockActionState',
    'updateTemplateActionState',
    'updateMasterSlideActionState',
    'updateAssetLibraryState',
    'bindStudioGlobalKeydownHandler'
  ];
  const options = {
    documentRef,
    windowRef,
    savedTheme: 'light'
  };
  callbackNames.forEach((name) => {
    options[name] = () => calls.push(name);
  });
  options.applyZoom = (value) => calls.push(['applyZoom', value]);
  options.syncCanvasRulers = () => calls.push('syncCanvasRulers');
  return {
    calls,
    elements,
    listeners,
    controller: bootstrapApi.createStudioEditorBootstrap(options)
  };
}

test('editor bootstrap preserves initialization order and installs chrome listeners', () => {
  const fixture = createBootstrapFixture();
  const { controller, calls, elements, listeners } = fixture;

  assert.equal(controller.bindDomReady(), true);
  assert.equal(controller.bindDomReady(), true);
  assert.equal(typeof listeners.document.DOMContentLoaded, 'function');
  listeners.document.DOMContentLoaded();

  assert.deepEqual(calls, [
    'loadPresentations',
    'renderWallpaperPresets',
    'renderThemeTokenPresets',
    'updateWallpaperActionState',
    'updateThemeTokenActionState',
    'updateGridSnapActionState',
    'updateDeckReadyToolbarActionState',
    'updateBlockActionState',
    'updateTemplateActionState',
    'updateMasterSlideActionState',
    'updateAssetLibraryState',
    'bindStudioGlobalKeydownHandler',
    'syncCanvasRulers'
  ]);
  assert.equal(elements.themeIcon.textContent, 'dark_mode');
  assert.equal(elements.themeIconEditor.textContent, 'dark_mode');
  assert.equal(typeof listeners.window.resize, 'function');
  assert.equal(typeof listeners.canvas.scroll, 'function');

  listeners.window.resize();
  listeners.canvas.scroll();
  assert.deepEqual(calls.slice(-3), [
    ['applyZoom', 'fit'],
    'syncCanvasRulers',
    'syncCanvasRulers'
  ]);
});

test('editor bootstrap initializes only once when the DOM-ready callback repeats', () => {
  const fixture = createBootstrapFixture();
  const { controller, calls, listeners } = fixture;

  controller.bindDomReady();
  listeners.document.DOMContentLoaded();
  listeners.document.DOMContentLoaded();

  assert.equal(calls.filter((call) => call === 'loadPresentations').length, 1);
  assert.equal(calls.filter((call) => call === 'syncCanvasRulers').length, 1);
});

test('editor bootstrap initializes immediately when the document is already ready', () => {
  const fixture = createBootstrapFixture();
  const { calls, listeners, elements } = fixture;

  const documentRef = {
    readyState: 'complete',
    addEventListener(type, handler) {
      listeners.document[type] = handler;
    },
    getElementById(id) {
      return elements[id] || null;
    }
  };
  const immediate = bootstrapApi.createStudioEditorBootstrap({
    documentRef,
    windowRef: {
      addEventListener(type, handler) {
        listeners.window[type] = handler;
      }
    },
    loadPresentations: () => calls.push('loadPresentations'),
    renderWallpaperPresets: () => calls.push('renderWallpaperPresets'),
    renderThemeTokenPresets: () => calls.push('renderThemeTokenPresets'),
    bindStudioGlobalKeydownHandler: () => calls.push('bindStudioGlobalKeydownHandler'),
    syncCanvasRulers: () => calls.push('syncCanvasRulers')
  });

  assert.equal(immediate.bindDomReady(), true);
  assert.equal(typeof listeners.document.DOMContentLoaded, 'undefined');
  assert.equal(calls.filter((call) => call === 'loadPresentations').length, 1);
  assert.equal(calls.filter((call) => call === 'syncCanvasRulers').length, 1);
});

test('index installs the shared editor bootstrap instead of owning the DOM-ready orchestration', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-bootstrap\.js"><\/script>/);
  assert.match(fileContent, /SlideNextStudioEditorBootstrap\.createStudioEditorBootstrap\(/);
  assert.doesNotMatch(fileContent, /document\.addEventListener\('DOMContentLoaded', \(\) => \{/);
});

test('index constructs global shortcuts before registering the DOM-ready bootstrap', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const shortcutsIndex = fileContent.indexOf('const studioEditorGlobalShortcutsController =');
  const bootstrapIndex = fileContent.indexOf('const studioEditorBootstrap =');

  assert.ok(shortcutsIndex >= 0);
  assert.ok(bootstrapIndex >= 0);
  assert.ok(shortcutsIndex < bootstrapIndex);
});
