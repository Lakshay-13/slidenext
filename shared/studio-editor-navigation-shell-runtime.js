(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorNavigationShellRuntime(options = {}) {
    const navigationRuntimeApi = resolveApi(
      options,
      'navigationRuntimeApi',
      'SlideNextStudioEditorNavigationRuntime'
    );
    if (!navigationRuntimeApi
      || typeof navigationRuntimeApi.createStudioEditorNavigationRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.navigationRuntimeApi;
    runtimeOptions.navigationApi = resolveApi(
      options,
      'navigationApi',
      'SlideNextStudioEditorNavigationController'
    );
    runtimeOptions.activeSlideApi = resolveApi(
      options,
      'activeSlideApi',
      'SlideNextStudioEditorActiveSlideController'
    );
    runtimeOptions.navigationSyncApi = resolveApi(
      options,
      'navigationSyncApi',
      'SlideNextStudioEditorNavigationSync'
    );
    runtimeOptions.thumbnailApi = resolveApi(
      options,
      'thumbnailApi',
      'SlideNextStudioEditorThumbnailController'
    );
    runtimeOptions.deckViewApi = resolveApi(
      options,
      'deckViewApi',
      'SlideNextStudioDeckView'
    );
    runtimeOptions.activeSlideView = resolveApi(
      options,
      'activeSlideView',
      'SlideNextStudioEditorActiveSlideView'
    );
    runtimeOptions.wallpaperView = resolveApi(
      options,
      'wallpaperView',
      'SlideNextStudioEditorWallpaperView'
    );
    runtimeOptions.thumbnailView = resolveApi(
      options,
      'thumbnailView',
      'SlideNextStudioEditorThumbnailView'
    );
    runtimeOptions.notesView = resolveApi(
      options,
      'notesView',
      'SlideNextStudioEditorNotes'
    );
    runtimeOptions.deckSnapshotApi = resolveApi(
      options,
      'deckSnapshotApi',
      'SlideNextStudioDeckSnapshot'
    );

    return navigationRuntimeApi.createStudioEditorNavigationRuntime(runtimeOptions);
  }

  return {
    createStudioEditorNavigationShellRuntime
  };
});
