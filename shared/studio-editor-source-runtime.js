(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function createStudioEditorSourceRuntime(options = {}) {
    const sourceControllerApi = resolveApi(
      options.sourceControllerApi,
      'SlideNextStudioEditorSourceController'
    );
    const sourceAccessorsApi = resolveApi(
      options.sourceAccessorsApi,
      'SlideNextStudioEditorSourceAccessors'
    );
    const sourceController = options.sourceController || null;
    const sourceHtmlBuilder = sourceControllerApi
      && typeof sourceControllerApi.createStudioEditorSourceHtmlBuilder === 'function'
      ? sourceControllerApi.createStudioEditorSourceHtmlBuilder({
          buildDeckViewHtml: options.buildDeckViewHtml,
          createDeckViewHtmlOptions: options.createDeckViewHtmlOptions,
          resolveBuildStudioSourceHtml: options.resolveBuildStudioSourceHtml,
          resolveBuildDeckSourceHtml: options.resolveBuildDeckSourceHtml
        })
      : null;
    const sourceCssResolver = sourceControllerApi
      && typeof sourceControllerApi.createStudioEditorSourceCssResolver === 'function'
      ? sourceControllerApi.createStudioEditorSourceCssResolver({
          getCurrentDocument: options.getCurrentDocument,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          buildSourceHtml: options.buildSourceHtml,
          extractSourceCss: options.extractSourceCss
        })
      : null;
    const sourceCssApplier = sourceControllerApi
      && typeof sourceControllerApi.createStudioEditorSourceCssApplier === 'function'
      ? sourceControllerApi.createStudioEditorSourceCssApplier({
          buildSourceHtml: options.buildSourceHtml,
          resolveReplaceSourceCss: options.resolveReplaceSourceCss,
          applySourceHtml: options.applySourceHtml
        })
      : null;
    const sourceAccessors = sourceAccessorsApi
      && typeof sourceAccessorsApi.createStudioEditorSourceAccessors === 'function'
      ? sourceAccessorsApi.createStudioEditorSourceAccessors({
          controller: sourceController
        })
      : null;

    return {
      sourceAccessors,
      sourceHtmlBuilder,
      sourceCssResolver,
      sourceCssApplier
    };
  }

  return {
    createStudioEditorSourceRuntime
  };
});
