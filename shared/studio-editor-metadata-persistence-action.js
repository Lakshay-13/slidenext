(function initStudioEditorMetadataPersistenceAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorMetadataPersistenceAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorMetadataPersistenceAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const getCurrentPresentationMetadata = typeof options.getCurrentPresentationMetadata === 'function'
      ? options.getCurrentPresentationMetadata
      : () => options.currentPresentationMetadata;
    const defaultResolveMergedPresentationPersistenceOptions =
      typeof options.resolveMergedPresentationPersistenceOptions === 'function'
        ? options.resolveMergedPresentationPersistenceOptions
        : null;
    const defaultResolvePresentationPersistenceOptions =
      typeof options.resolvePresentationPersistenceOptions === 'function'
        ? options.resolvePresentationPersistenceOptions
        : null;
    const defaultMergePresentationPersistenceOptions =
      typeof options.mergePresentationPersistenceOptions === 'function'
        ? options.mergePresentationPersistenceOptions
        : null;
    let metadataPersistenceAdapter = null;

    function getPersistenceFunction(name, fallback) {
      return persistenceApi && typeof persistenceApi[name] === 'function'
        ? persistenceApi[name]
        : fallback;
    }

    function resolveEditorMetadataPersistenceOptions(nextOptions = {}) {
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.resolveMetadataPersistenceOptions === 'function') {
        const result = persistenceController.resolveMetadataPersistenceOptions(nextOptions);
        if (result !== null && typeof result !== 'undefined') return result;
      }

      const createMetadataAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorMetadataPersistenceOptionsAdapter === 'function'
        ? persistenceStateApi.createStudioEditorMetadataPersistenceOptionsAdapter
        : null;
      if (createMetadataAdapter) {
        if (typeof metadataPersistenceAdapter !== 'function') {
          metadataPersistenceAdapter = createMetadataAdapter({
            persistenceApi,
            getCurrentPresentationMetadata,
            resolveMergedPresentationPersistenceOptions:
              defaultResolveMergedPresentationPersistenceOptions,
            resolvePresentationPersistenceOptions:
              defaultResolvePresentationPersistenceOptions,
            mergePresentationPersistenceOptions:
              defaultMergePresentationPersistenceOptions
          });
        }
        return typeof metadataPersistenceAdapter === 'function'
          ? metadataPersistenceAdapter(nextOptions)
          : {};
      }

      const resolveMergedPresentationPersistenceOptions =
        typeof nextOptions.resolveMergedPresentationPersistenceOptions === 'function'
          ? nextOptions.resolveMergedPresentationPersistenceOptions
          : getPersistenceFunction(
              'resolveMergedPresentationPersistenceOptions',
              defaultResolveMergedPresentationPersistenceOptions
            );
      const resolvePresentationPersistenceOptions =
        typeof nextOptions.resolvePresentationPersistenceOptions === 'function'
          ? nextOptions.resolvePresentationPersistenceOptions
          : getPersistenceFunction(
              'resolvePresentationPersistenceOptions',
              defaultResolvePresentationPersistenceOptions
            );
      const mergePresentationPersistenceOptions =
        typeof nextOptions.mergePresentationPersistenceOptions === 'function'
          ? nextOptions.mergePresentationPersistenceOptions
          : getPersistenceFunction(
              'mergePresentationPersistenceOptions',
              defaultMergePresentationPersistenceOptions
            );
      const resolveMetadataPersistenceOptions =
        typeof nextOptions.resolveStudioMetadataPersistenceOptions === 'function'
          ? nextOptions.resolveStudioMetadataPersistenceOptions
          : getPersistenceFunction('resolveStudioMetadataPersistenceOptions', null);
      const createMetadataResolver = persistenceApi
        && typeof persistenceApi.createStudioMetadataPersistenceOptionsResolver === 'function'
        ? persistenceApi.createStudioMetadataPersistenceOptionsResolver
        : null;
      if (createMetadataResolver) {
        return createMetadataResolver({
          getCurrentPresentationMetadata,
          resolveMergedPresentationPersistenceOptions,
          resolvePresentationPersistenceOptions,
          mergePresentationPersistenceOptions,
          resolveMetadataPersistenceOptions
        })(nextOptions);
      }
      if (!resolveMetadataPersistenceOptions) return {};
      return resolveMetadataPersistenceOptions({
        currentPresentationMetadata: Object.prototype.hasOwnProperty.call(
          nextOptions,
          'currentPresentationMetadata'
        )
          ? nextOptions.currentPresentationMetadata
          : getCurrentPresentationMetadata(),
        persistenceOptions: nextOptions.persistenceOptions,
        resolveMergedPresentationPersistenceOptions,
        resolvePresentationPersistenceOptions,
        mergePresentationPersistenceOptions
      });
    }

    return resolveEditorMetadataPersistenceOptions;
  }

  function createStudioEditorMetadataPersistenceGlobalApi(options = {}) {
    const resolveEditorMetadataPersistenceOptions =
      typeof options.resolveEditorMetadataPersistenceOptions === 'function'
        ? options.resolveEditorMetadataPersistenceOptions
        : null;
    return {
      resolveEditorMetadataPersistenceOptions: (...args) => resolveEditorMetadataPersistenceOptions
        ? resolveEditorMetadataPersistenceOptions(...args)
        : {}
    };
  }

  return {
    createStudioEditorMetadataPersistenceAction,
    createStudioEditorMetadataPersistenceGlobalApi
  };
}));
