(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationDashboardRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function resolveFactory(api, factoryName) {
    return api && typeof api[factoryName] === 'function'
      ? api[factoryName]
      : null;
  }

  function createPresentationDashboardRuntime(options = {}) {
    const presentationLibrary = resolveApi(
      options.presentationLibrary,
      'SlideNextPresentationLibrary'
    );
    const presentationLibraryView = resolveApi(
      options.presentationLibraryView,
      'SlideNextPresentationLibraryView'
    );
    const presentationCreationView = resolveApi(
      options.presentationCreationView,
      'SlideNextPresentationCreationView'
    );
    const dashboardControllerApi = resolveApi(
      options.dashboardControllerApi,
      'SlideNextPresentationDashboardController'
    );
    const creationControllerApi = resolveApi(
      options.creationControllerApi,
      'SlideNextPresentationCreationController'
    );

    const createDashboardController = resolveFactory(
      dashboardControllerApi,
      'createPresentationDashboardController'
    );
    const dashboardController = createDashboardController
      ? createDashboardController({
        documentRef: options.documentRef,
        presentationLibrary,
        presentationLibraryView,
        launchPresentation: options.launchPresentation,
        launchStudioEditor: options.launchStudioEditor
        })
      : null;

    const createCreationController = resolveFactory(
      creationControllerApi,
      'createPresentationController'
    );
    const creationController = createCreationController
      ? createCreationController({
          documentRef: options.documentRef,
          presentationCreationView,
          presentationLibrary,
          loadPresentations: options.loadPresentations,
          launchStudioEditor: options.launchStudioEditor
        })
      : null;

    return {
      dashboardController,
      creationController
    };
  }

  return {
    createPresentationDashboardRuntime
  };
});
