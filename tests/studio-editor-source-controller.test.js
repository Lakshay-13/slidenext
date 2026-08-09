const test = require('node:test');
const assert = require('node:assert/strict');
const sourceController = require('../shared/studio-editor-source-controller.js');

test('shared source html builder resolves defaults and preserves per-call overrides', () => {
  const calls = [];
  const doc = { id: 'editor-document' };
  const builder = sourceController.createStudioEditorSourceHtmlBuilder({
    buildDeckViewHtml(nextDoc, options) {
      calls.push(['build', nextDoc, options]);
      return '<html>source</html>';
    },
    createDeckViewHtmlOptions(options) {
      calls.push(['options', options]);
      return options;
    },
    resolveBuildStudioSourceHtml: () => 'shared-source-builder',
    resolveBuildDeckSourceHtml: () => 'canonical-source-builder'
  });
  const customBuildStudioSourceHtml = () => 'custom-source-builder';
  const customBuildDeckSourceHtml = () => 'custom-canonical-source-builder';
  const buildViewOptions = () => ({ activeSlideId: 'slide-1' });

  assert.equal(builder(doc, {
    buildStudioSourceHtml: customBuildStudioSourceHtml,
    buildDeckSourceHtml: customBuildDeckSourceHtml,
    buildViewOptions
  }), '<html>source</html>');
  assert.equal(calls[0][0], 'options');
  assert.equal(calls[0][1].buildSharedHtml, customBuildStudioSourceHtml);
  assert.equal(calls[0][1].buildCanonicalHtml, customBuildDeckSourceHtml);
  assert.equal(calls[0][1].buildViewOptions, buildViewOptions);
  assert.equal(calls[1][0], 'build');
  assert.equal(calls[1][1], doc);
});

function createController(overrides = {}) {
  const calls = [];
  const previewApi = {
    openStudioSourceView(options) {
      calls.push(['open', options]);
      return true;
    },
    applyStudioSourceView(options) {
      calls.push(['apply', options]);
      options.onApplySourceHtml('<html><body><section class="slide">Edited</section></body></html>');
      return true;
    },
    closeStudioSourceView(options) {
      calls.push(['close', options]);
    },
    resetStudioSourceViewUiState(options) {
      calls.push(['reset', options]);
    },
    resetStudioPresentationUiState(options) {
      calls.push(['resetPresentation', options]);
    }
  };
  const sourceApi = {
    applyStudioEditorSource(sourceHtml, options) {
      calls.push(['applySourceHtml', sourceHtml, options]);
      return { success: true, canonicalDeck: { slides: [{ id: 'slide-1' }] } };
    }
  };
  const documentRef = { id: 'editor-document' };
  const controller = sourceController.createStudioEditorSourceController({
    previewApi,
    sourceApi,
    documentRef,
    resolveReadyState: () => ({ canUseDeckActions: true }),
    resolveSourceHtml: () => '<html>source</html>',
    buildCanonicalDeck: (document) => ({ slides: [{ id: document.id }] }),
    getCurrentDocument: () => ({ id: 'live-frame' }),
    resolveActiveSlideId: () => 'slide-1',
    resolveHistoryOptions: () => ({
      sanitizeFrameRoot() {}
    }),
    isCanonicalDeck: (value) => Array.isArray(value && value.slides),
    beforeApply: () => true,
    restoreHistoryEntry: () => true,
    afterApply: () => {},
    ...overrides
  });
  return { calls, controller };
}

test('source controller delegates modal operations and source application', () => {
  const { calls, controller } = createController();

  assert.equal(controller.open(), true);
  assert.equal(controller.apply(), true);
  assert.equal(controller.close(), true);
  assert.equal(controller.reset(), true);
  assert.equal(controller.resetPresentation(), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'open',
    'apply',
    'applySourceHtml',
    'close',
    'reset',
    'resetPresentation'
  ]);
  assert.equal(calls[0][1].document.id, 'editor-document');
  assert.equal(calls[0][1].editable, true);
  assert.equal(calls[0][1].resolveSourceHtml(), '<html>source</html>');
  assert.equal(calls[1][1].document.id, 'editor-document');
  assert.equal(calls[2][2].buildCanonicalDeck({ id: 'parsed' }).slides[0].id, 'parsed');
  assert.equal(calls[2][2].getCurrentDocument().id, 'live-frame');
});

test('source controller blocks modal operations when deck actions are unavailable', () => {
  const { calls, controller } = createController({
    resolveReadyState: () => ({ canUseDeckActions: false })
  });

  assert.equal(controller.open(), false);
  assert.equal(controller.apply(), false);
  assert.equal(calls.length, 0);
});

test('source controller forwards the live canonical baseline to source application', () => {
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  const { calls, controller } = createController({
    getCanonicalDeckBaseline: () => canonicalDeckBaseline
  });

  controller.applySourceHtml('<html></html>');

  assert.equal(calls[0][2].canonicalDeckBaseline, canonicalDeckBaseline);
});

test('source controller reports source engine unavailability without throwing', () => {
  const { controller } = createController({ sourceApi: null });

  assert.deepEqual(controller.applySourceHtml('<html></html>'), {
    success: false,
    error: 'Source editor is unavailable'
  });
});

test('source controller blocks direct source application when the editor deck is unavailable', () => {
  let sourceCalls = 0;
  const { controller } = createController({
    resolveReadyState: () => ({ canUseDeckActions: false }),
    sourceApi: {
      applyStudioEditorSource() {
        sourceCalls += 1;
        return { success: true };
      }
    }
  });

  assert.deepEqual(controller.applySourceHtml('<html></html>'), {
    success: false,
    error: 'Editor deck is unavailable'
  });
  assert.equal(sourceCalls, 0);
});

test('source controller contains resolver and source adapter failures', () => {
  const { controller } = createController({
    resolveHistoryOptions() {
      throw new Error('history options unavailable');
    },
    sourceApi: {
      applyStudioEditorSource() {
        throw new Error('source adapter failed');
      }
    }
  });

  assert.deepEqual(controller.applySourceHtml('<html></html>'), {
    success: false,
    error: 'Source HTML could not be applied'
  });
});
