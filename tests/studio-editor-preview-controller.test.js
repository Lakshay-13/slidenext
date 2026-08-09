const test = require('node:test');
const assert = require('node:assert/strict');

const previewController = require('../shared/studio-editor-preview-controller.js');

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
    presentationUrl: '/presentations/demo/index.html'
  });

  assert.equal(result, deckViewOptions);
  assert.equal(delegatedOptions.buildSharedHtml(), '<html>shared</html>');
  assert.equal(delegatedOptions.buildCanonicalHtml(), '<html>canonical</html>');
  assert.deepEqual(
    delegatedOptions.mapCanonicalHtmlArgs('deck', { renderOptions: {} }),
    ['deck', '/presentations/demo/index.html', { renderOptions: {} }]
  );
  assert.equal(delegatedOptions.transformFallbackHtml(), '<html>fallback</html>');
});
