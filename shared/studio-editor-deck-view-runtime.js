(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckViewRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorDeckViewRuntime(options = {}) {
    const exportApi = options.exportApi
      && typeof options.exportApi.createStudioEditorExportController === 'function'
      ? options.exportApi
      : null;
    const snapshotControllerApi = options.snapshotControllerApi
      && typeof options.snapshotControllerApi.createStudioEditorDeckSnapshotController === 'function'
      ? options.snapshotControllerApi
      : null;
    const previewControllerApi = options.previewControllerApi
      && typeof options.previewControllerApi.createStudioEditorPreviewController === 'function'
      ? options.previewControllerApi
      : null;
    const sourceControllerApi = options.sourceControllerApi
      && typeof options.sourceControllerApi.createStudioEditorSourceController === 'function'
      ? options.sourceControllerApi
      : null;

    const exportController = exportApi
      ? exportApi.createStudioEditorExportController({
          exportActions: options.exportActions,
          resolveReadyState: options.resolveReadyState,
          buildPreviewHtml: options.buildPreviewHtml,
          buildCanonicalDeck: options.buildCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          isCanonicalDeck: options.isCanonicalDeck,
          pdfExport: options.pdfExport,
          pptxExport: options.pptxExport,
          documentRef: options.documentRef,
          setStatus: options.setStatus,
          resolveSourcePath: options.resolveSourcePath,
          resolveFilename: options.resolveFilename
        })
      : null;
    const deckSnapshotController = snapshotControllerApi
      ? snapshotControllerApi.createStudioEditorDeckSnapshotController({
          snapshotApi: options.snapshotApi,
          getDocument: options.getDocument,
          createDeckViewStateOptions: options.createDeckViewStateOptions,
          resolveCanonicalDeckViewState: options.resolveCanonicalDeckViewState,
          resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId,
          resolveLiveActiveSlide: options.resolveLiveActiveSlide,
          getActiveSlideId: options.getActiveSlideId,
          getSlideById: options.getSlideById,
          buildSlideLayerSnapshot: options.buildSlideLayerSnapshot,
          getSlides: options.getSlides,
          getActiveSlide: options.getActiveSlide,
          getSlideId: options.getSlideId,
          getSlideEditableElements: options.getSlideEditableElements,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          buildElementSnapshot: options.buildElementSnapshot
        })
      : null;
    const previewController = previewControllerApi
      ? previewControllerApi.createStudioEditorPreviewController({
          previewApi: options.previewApi,
          documentRef: options.documentRef,
          resolveReadyState: options.resolveReadyState,
          resolvePresentationUrl: options.resolvePresentationUrl,
          resolveActiveSlideIndex: options.resolveActiveSlideIndex,
          buildPreviewHtml: options.previewBuildHtml,
          buildCanonicalDeck: options.previewBuildCanonicalDeck,
          isCanonicalDeck: options.previewIsCanonicalDeck
        })
      : null;
    const sourceController = sourceControllerApi
      ? sourceControllerApi.createStudioEditorSourceController({
          previewApi: options.previewApi,
          sourceApi: options.sourceApi,
          documentRef: options.documentRef,
          resolveReadyState: options.resolveReadyState,
          resolveSourceHtml: options.resolveSourceHtml,
          resolveSourceCss: options.resolveSourceCss,
          applySourceCss: options.applySourceCss,
          buildCanonicalDeck: options.sourceBuildCanonicalDeck,
          getCanonicalDeckBaseline: options.sourceGetCanonicalDeckBaseline,
          getCurrentDocument: options.getCurrentDocument,
          resolveActiveSlideId: options.resolveActiveSlideId,
          resolveHistoryOptions: options.resolveHistoryOptions,
          isCanonicalDeck: options.sourceIsCanonicalDeck,
          beforeApply: options.beforeApply,
          restoreHistoryEntry: options.restoreHistoryEntry,
          afterApply: options.afterApply
        })
      : null;

    return {
      exportController,
      deckSnapshotController,
      previewController,
      sourceController
    };
  }

  return {
    createStudioEditorDeckViewRuntime
  };
});
