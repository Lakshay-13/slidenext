const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-source-accessors.js');
const sourceRuntime = require('../shared/studio-editor-source-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-source-accessors.js');
const RUNTIME_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-source-runtime.js');

test('source runtime composes source adapters behind one editor seam', () => {
  const calls = [];
  const sourceControllerApi = {
    createStudioEditorSourceHtmlBuilder(options) {
      calls.push(['html', options]);
      return 'html-builder';
    },
    createStudioEditorSourceCssResolver(options) {
      calls.push(['css-resolver', options]);
      return 'css-resolver';
    },
    createStudioEditorSourceCssApplier(options) {
      calls.push(['css-applier', options]);
      return 'css-applier';
    }
  };
  const sourceAccessorsApi = {
    createStudioEditorSourceAccessors(options) {
      calls.push(['accessors', options]);
      return 'accessors';
    }
  };
  const options = {
    sourceControllerApi,
    sourceAccessorsApi,
    sourceController: { name: 'controller' },
    buildDeckViewHtml() {},
    createDeckViewHtmlOptions() {},
    resolveBuildStudioSourceHtml() {},
    resolveBuildDeckSourceHtml() {},
    getCurrentDocument() {},
    resolveCanonicalDeck() {},
    buildSourceHtml() {},
    extractSourceCss() {},
    resolveReplaceSourceCss() {},
    applySourceHtml() {}
  };

  const result = sourceRuntime.createStudioEditorSourceRuntime(options);

  assert.deepEqual(result, {
    sourceAccessors: 'accessors',
    sourceHtmlBuilder: 'html-builder',
    sourceCssResolver: 'css-resolver',
    sourceCssApplier: 'css-applier'
  });
  assert.equal(calls[0][1].buildDeckViewHtml, options.buildDeckViewHtml);
  assert.equal(calls[1][1].resolveCanonicalDeck, options.resolveCanonicalDeck);
  assert.equal(calls[2][1].applySourceHtml, options.applySourceHtml);
  assert.equal(calls[3][1].controller, options.sourceController);
});

test('source accessors delegate the source modal action contract', () => {
  const calls = [];
  const controller = {
    open: () => {
      calls.push('open');
      return true;
    },
    setMode: (mode) => {
      calls.push(['mode', mode]);
      return true;
    },
    applySourceHtml: (html) => {
      calls.push(['source', html]);
      return { success: true };
    },
    apply: () => {
      calls.push('apply');
      return true;
    },
    close: () => {
      calls.push('close');
      return true;
    },
    reset: () => {
      calls.push('reset');
      return true;
    },
    resetPresentation: () => {
      calls.push('reset-presentation');
      return true;
    }
  };
  const accessors = accessorsApi.createStudioEditorSourceAccessors({ controller });

  assert.equal(accessors.open(), true);
  assert.equal(accessors.setMode('css'), true);
  assert.deepEqual(accessors.applySourceHtml('<html>edited</html>'), { success: true });
  assert.equal(accessors.apply(), true);
  assert.equal(accessors.close(), true);
  assert.equal(accessors.reset(), true);
  assert.equal(accessors.resetPresentation(), true);
  assert.deepEqual(calls, [
    'open',
    ['mode', 'css'],
    ['source', '<html>edited</html>'],
    'apply',
    'close',
    'reset',
    'reset-presentation'
  ]);
});

test('source accessors preserve source editor fallbacks without a controller', () => {
  const accessors = accessorsApi.createStudioEditorSourceAccessors();

  assert.equal(accessors.open(), false);
  assert.equal(accessors.setMode(), false);
  assert.deepEqual(accessors.applySourceHtml(), {
    success: false,
    error: 'Source editor is unavailable'
  });
  assert.equal(accessors.apply(), false);
  assert.equal(accessors.close(), false);
  assert.equal(accessors.reset(), false);
  assert.equal(accessors.resetPresentation(), false);
});

test('source global api preserves the editor shell function names', () => {
  const calls = [];
  const accessors = {
    open: () => calls.push('open'),
    setMode: (mode) => calls.push(['mode', mode]),
    applySourceHtml: (sourceHtml) => calls.push(['source', sourceHtml]),
    apply: () => calls.push('apply'),
    close: () => calls.push('close'),
    reset: () => calls.push('reset'),
    resetPresentation: () => calls.push('reset-presentation')
  };
  const globalApi = accessorsApi.createStudioEditorSourceGlobalApi({ accessors });

  globalApi.openSourceViewModal();
  globalApi.setSourceViewMode('css');
  globalApi.applyEditorSourceHtml('<html>edited</html>');
  globalApi.applySourceViewModal();
  globalApi.closeSourceViewModal();
  globalApi.resetStudioSourceViewUiState();
  globalApi.resetStudioPresentationUiState();

  assert.deepEqual(calls, [
    'open',
    ['mode', 'css'],
    ['source', '<html>edited</html>'],
    'apply',
    'close',
    'reset',
    'reset-presentation'
  ]);
});

test('source accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSourceAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSourceAccessors
      .createStudioEditorSourceAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSourceAccessors
      .createStudioEditorSourceGlobalApi,
    'function'
  );
});

test('editor loads source accessors after the source controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-source-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /sourceAccessorsApi: typeof SlideNextStudioEditorSourceAccessors/);
  assert.match(fileContent, /studioEditorSourceAccessors/);
  assert.match(fileContent, /createStudioEditorSourceGlobalApi\(/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorSourceGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function openSourceViewModal\(\)/);
  assert.doesNotMatch(fileContent, /function setSourceViewMode\(mode = 'html'\)\s*\{/);
  assert.doesNotMatch(fileContent, /function applyEditorSourceHtml\(sourceHtml = ''\)\s*\{/);
  assert.doesNotMatch(fileContent, /function applySourceViewModal\(\)/);
  assert.doesNotMatch(fileContent, /function closeSourceViewModal\(\)/);
  assert.doesNotMatch(fileContent, /function resetStudioSourceViewUiState\(\)/);
  assert.doesNotMatch(fileContent, /function resetStudioPresentationUiState\(\)/);
});

test('editor loads the source runtime after source adapters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-source-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-source-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-source-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorSourceRuntimeAccessors\(/);
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSourceController\.createStudioEditorSource(CssResolver|CssApplier|HtmlBuilder)\(/
  );
});

test('source runtime publishes its browser global', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(RUNTIME_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSourceRuntime, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSourceRuntime.createStudioEditorSourceRuntime,
    'function'
  );
});
