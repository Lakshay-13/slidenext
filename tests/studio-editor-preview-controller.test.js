const test = require('node:test');
const assert = require('node:assert/strict');

const previewController = require('../shared/studio-editor-preview-controller.js');

test('shared preview html builder resolves current preview dependencies at build time', () => {
  const calls = [];
  const doc = { id: 'editor-document' };
  const result = previewController.createStudioEditorPreviewHtmlBuilder({
    buildDeckViewHtml(nextDoc, options) {
      calls.push(['build', nextDoc, options]);
      return '<html>preview</html>';
    },
    createDeckViewHtmlOptions(options) {
      calls.push(['options', options]);
      return options;
    },
    resolveBuildStudioPreviewHtml: () => 'shared-builder',
    resolveBuildDeckPreviewHtml: () => 'canonical-builder',
    resolveInjectBaseHrefIntoHtml: () => 'inject-base',
    resolveBuildPresentationBaseHref: () => 'build-base',
    resolvePresentationUrl: () => '/presentations/demo/index.html'
  });

  assert.equal(result(doc, { canonicalDeck: { slides: [] } }), '<html>preview</html>');
  assert.equal(calls[0][0], 'options');
  assert.equal(calls[0][1].buildStudioPreviewHtml, 'shared-builder');
  assert.equal(calls[0][1].buildDeckPreviewHtml, 'canonical-builder');
  assert.equal(calls[0][1].injectBaseHrefIntoHtml, 'inject-base');
  assert.equal(calls[0][1].buildPresentationBaseHref, 'build-base');
  assert.equal(calls[0][1].presentationUrl, '/presentations/demo/index.html');
  assert.equal(calls[1][0], 'build');
  assert.equal(calls[1][1], doc);
});

test('launches the shared preview with the live editor session state', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchStudioPresentation(options) {
        calls.push(options);
        return 'html';
      }
    },
    documentRef: iframeDocument,
    resolveReadyState: () => ({ canLaunchPreview: true }),
    resolvePresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    resolveActiveSlideIndex: () => 2,
    buildPreviewHtml: () => '<html>preview</html>'
  });

  assert.equal(controller.launch(), 'html');
  assert.deepEqual(calls, [{
    document: iframeDocument,
    startSlideIdx: 2,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    previewHtml: '<html>preview</html>'
  }]);
});

test('opens the presentation modal through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      openPresentationModalWithLoader(options) {
        calls.push(options);
        return 'modal';
      }
    },
    documentRef: iframeDocument
  });

  assert.equal(controller.openModal(5), 'modal');
  assert.deepEqual(calls, [{
    document: iframeDocument,
    startSlideIdx: 5
  }]);
});

test('closes the presentation modal through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      resetStudioPresentationUiState(options) {
        calls.push(options);
      }
    },
    documentRef: iframeDocument
  });

  assert.equal(controller.closeModal(), true);
  assert.deepEqual(calls, [{ document: iframeDocument }]);
});

test('fails closed when the preview reset API is unavailable', () => {
  const controller = previewController.createStudioEditorPreviewController({ previewApi: {} });

  assert.equal(controller.closeModal(), false);
});

test('toggles presentation fullscreen through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const consoleRef = { error() {} };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      toggleStudioPresentationFullscreen(options) {
        calls.push(options);
        return 'fullscreen';
      }
    },
    documentRef: iframeDocument,
    consoleRef
  });

  assert.equal(controller.toggleFullscreen(), 'fullscreen');
  assert.deepEqual(calls, [{
    document: iframeDocument,
    consoleRef
  }]);
});

test('syncs the fullscreen icon through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      syncStudioFullscreenIcon(options) {
        calls.push(options);
        return true;
      }
    },
    documentRef: iframeDocument
  });

  assert.equal(controller.syncFullscreenIcon(), true);
  assert.deepEqual(calls, [{ document: iframeDocument }]);
});

test('launches legacy HTML through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchPresentationHtml(options) {
        calls.push(options);
        return 'html';
      }
    },
    documentRef: iframeDocument
  });

  assert.equal(controller.launchHtml('<html>legacy</html>', 3), 'html');
  assert.deepEqual(calls, [{
    document: iframeDocument,
    startSlideIdx: 3,
    html: '<html>legacy</html>'
  }]);
});

test('launches a URL through the shared preview controller', () => {
  const calls = [];
  const iframeDocument = { id: 'editor-document' };
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchPresentationUrl(options) {
        calls.push(options);
        return 'url';
      }
    },
    documentRef: iframeDocument
  });

  assert.equal(controller.launchUrl('/presentations/demo/index.html', 4), 'url');
  assert.deepEqual(calls, [{
    document: iframeDocument,
    startSlideIdx: 4,
    url: '/presentations/demo/index.html'
  }]);
});

test('fails closed when the legacy HTML preview API is unavailable', () => {
  const controller = previewController.createStudioEditorPreviewController({ previewApi: {} });

  assert.equal(controller.launchHtml('<html>legacy</html>', 0), false);
});

test('launches preview with one validated canonical deck snapshot', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const calls = [];
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchStudioPresentation(options) {
        calls.push(options);
        return true;
      }
    },
    resolveReadyState: () => ({ canLaunchPreview: true }),
    resolvePresentationUrl: () => '/presentations/demo/index.html',
    buildCanonicalDeck() {
      return canonicalDeck;
    },
    isCanonicalDeck(value) {
      return value === canonicalDeck;
    },
    buildPreviewHtml(nextCanonicalDeck) {
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return '<html>canonical-preview</html>';
    }
  });

  assert.equal(controller.launch(), true);
  assert.equal(calls[0].previewHtml, '<html>canonical-preview</html>');
});

test('keeps preview fallback behavior when canonical snapshot resolution fails', () => {
  let receivedCanonicalDeck = 'unset';
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchStudioPresentation(options) {
        assert.equal(options.previewHtml, '<html>legacy-preview</html>');
        return true;
      }
    },
    resolveReadyState: () => ({ canLaunchPreview: true }),
    resolvePresentationUrl: () => '/presentations/demo/index.html',
    buildCanonicalDeck() {
      throw new Error('legacy deck has no canonical snapshot');
    },
    buildPreviewHtml(nextCanonicalDeck) {
      receivedCanonicalDeck = nextCanonicalDeck;
      return '<html>legacy-preview</html>';
    }
  });

  assert.equal(controller.launch(), true);
  assert.equal(receivedCanonicalDeck, null);
});

test('does not build or launch preview content when the editor is not ready', () => {
  let buildCalls = 0;
  let launchCalls = 0;
  const controller = previewController.createStudioEditorPreviewController({
    previewApi: {
      launchStudioPresentation() {
        launchCalls += 1;
      }
    },
    resolveReadyState: () => ({ canLaunchPreview: false }),
    resolvePresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    buildPreviewHtml: () => {
      buildCalls += 1;
      return '<html>preview</html>';
    }
  });

  assert.equal(controller.launchPreview(), false);
  assert.equal(buildCalls, 0);
  assert.equal(launchCalls, 0);
});

test('fails closed when the current presentation has no url or shared preview api', () => {
  const noUrlController = previewController.createStudioEditorPreviewController({
    previewApi: {},
    resolveReadyState: () => ({ canLaunchPreview: true }),
    resolvePresentationUrl: () => ''
  });
  const noApiController = previewController.createStudioEditorPreviewController({
    previewApi: {},
    resolveReadyState: () => ({ canLaunchPreview: true }),
    resolvePresentationUrl: () => '/presentations/deck/index.html'
  });

  assert.equal(noUrlController.launch(), false);
  assert.equal(noApiController.launch(), false);
});

test('composes preview deck-view options through injected shared helpers', () => {
  const deckViewOptions = { buildViewOptions() {} };
  const fallbackTransformer = () => '<html>fallback</html>';
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  let delegatedOptions = null;
  const controller = previewController.createStudioEditorPreviewController({});

  const result = controller.createStudioEditorPreviewDeckViewHtmlOptions({
    createDeckViewHtmlOptions(options) {
      delegatedOptions = options;
      return deckViewOptions;
    },
    createFallbackHtmlTransformer(options) {
      assert.equal(options.presentationUrl, '/presentations/demo/index.html');
      return fallbackTransformer;
    },
    buildStudioPreviewHtml: () => '<html>shared</html>',
    buildDeckPreviewHtml: () => '<html>canonical</html>',
    injectBaseHrefIntoHtml() {},
    buildPresentationBaseHref() {},
    canonicalDeck,
    presentationUrl: '/presentations/demo/index.html'
  });

  assert.equal(result, deckViewOptions);
  assert.equal(delegatedOptions.buildSharedHtml(), '<html>shared</html>');
  assert.equal(delegatedOptions.buildCanonicalHtml(), '<html>canonical</html>');
  assert.deepEqual(
    delegatedOptions.extendViewOptions({ activeSlideId: 'slide-1' }),
    {
      activeSlideId: 'slide-1',
      presentationUrl: '/presentations/demo/index.html',
      canonicalDeck
    }
  );
  assert.deepEqual(
    delegatedOptions.mapCanonicalHtmlArgs('deck', { renderOptions: {} }),
    ['deck', '/presentations/demo/index.html', { renderOptions: {} }]
  );
  assert.equal(delegatedOptions.transformFallbackHtml(), '<html>fallback</html>');
});
