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

test('source history baseline capture prefers the live canonical deck', () => {
  const liveDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    getCanonicalDeckBaseline: (documentRef) => {
      assert.deepEqual(documentRef, { id: 'live-frame' });
      return liveDeck;
    },
    buildCanonicalDeck: () => {
      throw new Error('DOM rebuild should not be needed');
    },
    saveHistoryState: (...args) => calls.push(args)
  });

  assert.equal(capture(), true);
  assert.deepEqual(calls, [[false, null, liveDeck]]);
});

test('source history baseline capture falls back to rebuilding from the live document', () => {
  const rebuiltDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const calls = [];
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    getCanonicalDeckBaseline: () => null,
    buildCanonicalDeck: (documentRef, options) => {
      assert.deepEqual(documentRef, { id: 'live-frame' });
      assert.deepEqual(options, { preferLiveCanonicalDeck: false });
      return rebuiltDeck;
    },
    saveHistoryState: (...args) => calls.push(args)
  });

  assert.equal(capture(), true);
  assert.deepEqual(calls, [[false, null, rebuiltDeck]]);
});

test('source history baseline capture fails before source replacement when persistence rejects', () => {
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    getCanonicalDeckBaseline: () => ({ kind: 'slidenext.deck', slides: [] }),
    saveHistoryState: () => false
  });

  assert.equal(capture(), false);
});

test('source history baseline capture rejects object-form persistence failures', () => {
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    getCanonicalDeckBaseline: () => ({ kind: 'slidenext.deck', slides: [] }),
    saveHistoryState: () => ({ didCapture: false })
  });

  assert.equal(capture(), false);
});

test('source history baseline capture rejects thrown persistence failures', () => {
  const capture = sourceController.createStudioEditorSourceHistoryBaselineCapture({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    getCanonicalDeckBaseline: () => ({ kind: 'slidenext.deck', slides: [] }),
    saveHistoryState: () => {
      throw new Error('history unavailable');
    }
  });

  assert.equal(capture(), false);
});

test('source CSS resolver prefers canonical custom CSS', () => {
  const calls = [];
  const resolveSourceCss = sourceController.createStudioEditorSourceCssResolver({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    resolveCanonicalDeck: (documentRef) => {
      calls.push(['resolve', documentRef]);
      return { theme: { customCss: ' .slide { color: red; } ' } };
    },
    buildSourceHtml: () => {
      calls.push(['build']);
      return '<style data-slidenext-source-css="custom">fallback</style>';
    },
    extractSourceCss: () => {
      calls.push(['extract']);
      return 'fallback';
    }
  });

  assert.equal(resolveSourceCss(), ' .slide { color: red; } ');
  assert.deepEqual(calls, [['resolve', { id: 'live-frame' }]]);
});

test('source CSS resolver falls back to marked source CSS', () => {
  const calls = [];
  const resolveSourceCss = sourceController.createStudioEditorSourceCssResolver({
    getCurrentDocument: () => ({ id: 'live-frame' }),
    resolveCanonicalDeck: () => null,
    buildSourceHtml: () => {
      calls.push(['build']);
      return '<html>source</html>';
    },
    extractSourceCss: (sourceHtml) => {
      calls.push(['extract', sourceHtml]);
      return '.slide { color: blue; }';
    }
  });

  assert.equal(resolveSourceCss(), '.slide { color: blue; }');
  assert.deepEqual(calls, [['build'], ['extract', '<html>source</html>']]);
});

test('source CSS applier rebuilds source HTML before delegating', () => {
  const calls = [];
  const applySourceCss = sourceController.createStudioEditorSourceCssApplier({
    buildSourceHtml: () => {
      calls.push(['build']);
      return '<html>source</html>';
    },
    resolveReplaceSourceCss: () => (sourceHtml, sourceCss) => {
      calls.push(['replace', sourceHtml, sourceCss]);
      return '<html>updated</html>';
    },
    applySourceHtml: (sourceHtml) => {
      calls.push(['apply', sourceHtml]);
      return { success: true };
    }
  });

  assert.deepEqual(applySourceCss('.slide { color: blue; }'), { success: true });
  assert.deepEqual(calls, [
    ['build'],
    ['replace', '<html>source</html>', '.slide { color: blue; }'],
    ['apply', '<html>updated</html>']
  ]);
});

test('source CSS applier fails closed when source replacement is unavailable', () => {
  let buildCalls = 0;
  const applySourceCss = sourceController.createStudioEditorSourceCssApplier({
    buildSourceHtml: () => {
      buildCalls += 1;
      return '<html>source</html>';
    }
  });

  assert.deepEqual(applySourceCss('.slide { color: blue; }'), {
    success: false,
    error: 'Source CSS editor is unavailable'
  });
  assert.equal(buildCalls, 0);
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
    setStudioSourceViewMode(options) {
      calls.push(['mode', options]);
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
    resolveSourceCss: () => '.slide { color: red; }',
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
  assert.equal(calls[0][1].resolveSourceCss(), '.slide { color: red; }');
  assert.equal(calls[1][1].document.id, 'editor-document');
  assert.equal(calls[2][2].buildCanonicalDeck({ id: 'parsed' }).slides[0].id, 'parsed');
  assert.equal(calls[2][2].getCurrentDocument().id, 'live-frame');
});

test('source controller delegates source mode switching and tracks the active mode', () => {
  const { calls, controller } = createController();

  assert.equal(controller.setMode('css'), true);
  assert.equal(calls[0][0], 'mode');
  assert.equal(calls[0][1].mode, 'css');
  assert.equal(calls[0][1].resolveSourceCss(), '.slide { color: red; }');
  assert.equal(controller.setMode('html'), true);
  assert.equal(calls[1][1].mode, 'html');
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

test('source controller forwards the pre-apply history capture callback', () => {
  const captureHistoryEntry = () => ({ html: '<section class="slide">Original</section>' });
  const { calls, controller } = createController({ captureHistoryEntry });

  controller.applySourceHtml('<html></html>');

  assert.equal(calls[0][2].captureHistoryEntry, captureHistoryEntry);
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
