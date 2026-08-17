(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationDashboardShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    return options[optionName]
      || (root && root[globalName])
      || null;
  }

  function createPresentationDashboardShellComposition(options = {}) {
    const runtimeApi = resolveApi(
      options,
      'runtimeApi',
      'SlideNextPresentationDashboardRuntime'
    );
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextPresentationDashboardAccessors'
    );
    const runtime = runtimeApi
      && typeof runtimeApi.createPresentationDashboardRuntime === 'function'
      ? runtimeApi.createPresentationDashboardRuntime({
          documentRef: options.documentRef,
          dashboardControllerApi: resolveApi(
            options,
            'dashboardControllerApi',
            'SlideNextPresentationDashboardController'
          ),
          creationControllerApi: resolveApi(
            options,
            'creationControllerApi',
            'SlideNextPresentationCreationController'
          ),
          presentationLibrary: resolveApi(
            options,
            'presentationLibrary',
            'SlideNextPresentationLibrary'
          ),
          presentationLibraryView: resolveApi(
            options,
            'presentationLibraryView',
            'SlideNextPresentationLibraryView'
          ),
          presentationCreationView: resolveApi(
            options,
            'presentationCreationView',
            'SlideNextPresentationCreationView'
          ),
          loadPresentations: options.loadPresentations,
          launchPresentation: options.launchPresentation,
          launchStudioEditor: options.launchStudioEditor
        })
      : null;
    const dashboardController = runtime
      ? runtime.dashboardController
      : null;
    const creationController = runtime
      ? runtime.creationController
      : null;

    if (creationController
      && typeof creationController.bindPresentationCreationButtons === 'function') {
      creationController.bindPresentationCreationButtons({
        documentRef: options.documentRef
      });
    }

    const accessors = accessorsApi
      && typeof accessorsApi.createPresentationDashboardAccessors === 'function'
      ? accessorsApi.createPresentationDashboardAccessors({
          dashboardController,
          creationController
        })
      : null;
    const globalApi = accessorsApi
      && typeof accessorsApi.createPresentationDashboardGlobalApi === 'function'
      ? accessorsApi.createPresentationDashboardGlobalApi({
          accessors: accessors
            || accessorsApi.createPresentationDashboardAccessors({
              dashboardController,
              creationController
            })
        })
      : {};

    return {
      runtime,
      dashboardController,
      creationController,
      accessors,
      globalApi
    };
  }

  return {
    createPresentationDashboardShellComposition
  };
});
