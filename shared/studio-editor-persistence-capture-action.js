(function initStudioEditorPersistenceCaptureAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceCaptureAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceCaptureAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCapturePersistableDeckState =
      typeof options.getCapturePersistableDeckState === 'function'
        ? options.getCapturePersistableDeckState
        : () => null;
    let captureResolverAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function resolveCurrentStudioPersistenceStateFromCapture(doc = getDocument(), options = {}) {
      const nextOptions = options && typeof options === 'object'
        ? options
        : {};
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerResolver = getFunction(
        persistenceController,
        'resolvePersistenceStateFromCapture'
      );
      if (controllerResolver) {
        const resolvedState = controllerResolver(doc, nextOptions);
        if (resolvedState !== null && typeof resolvedState !== 'undefined') {
          return resolvedState;
        }
      }

      const createCaptureResolverAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter'
      );
      if (createCaptureResolverAdapter) {
        if (typeof captureResolverAdapter !== 'function') {
          captureResolverAdapter = createCaptureResolverAdapter({
            persistenceApi,
            getPresentationUrl,
            capturePersistableDeckState: getCapturePersistableDeckState()
          });
        }
        const resolvedState = typeof captureResolverAdapter === 'function'
          ? captureResolverAdapter(doc, nextOptions)
          : null;
        if (resolvedState !== null && typeof resolvedState !== 'undefined') {
          return resolvedState;
        }
      }

      const createCaptureResolver = getFunction(
        persistenceApi,
        'createStudioPersistenceStateFromDocumentCaptureResolver'
      );
      if (createCaptureResolver) {
        return createCaptureResolver({
          getPresentationUrl,
          capturePersistableDeckState: getCapturePersistableDeckState(),
          resolvePersistenceStateFromDocumentCapture: getFunction(
            persistenceApi,
            'resolveStudioPersistenceStateFromDocumentCapture'
          )
        })(doc, nextOptions);
      }

      const resolvePersistenceStateFromCapture = nextOptions.resolvePersistenceStateFromCapture;
      if (typeof resolvePersistenceStateFromCapture !== 'function') {
        return null;
      }
      const resolvePersistenceStateFromDocumentCapture = getFunction(
        persistenceApi,
        'resolveStudioPersistenceStateFromDocumentCapture'
      );
      if (!resolvePersistenceStateFromDocumentCapture) return null;
      const capturePersistableDeckState = typeof nextOptions.capturePersistableDeckState === 'function'
        ? nextOptions.capturePersistableDeckState
        : getCapturePersistableDeckState();
      return resolvePersistenceStateFromDocumentCapture(
        doc,
        typeof nextOptions.presentationUrl === 'string' && nextOptions.presentationUrl
          ? nextOptions.presentationUrl
          : getPresentationUrl(),
        {
          capturePersistableDeckState,
          persistenceOptions: nextOptions.persistenceOptions
            && typeof nextOptions.persistenceOptions === 'object'
            && !Array.isArray(nextOptions.persistenceOptions)
            ? { ...nextOptions.persistenceOptions }
            : {}
        },
        resolvePersistenceStateFromCapture
      );
    }

    return resolveCurrentStudioPersistenceStateFromCapture;
  }

  function createStudioEditorPersistenceCaptureGlobalApi(options = {}) {
    const resolveCurrentStudioPersistenceStateFromCapture =
      typeof options.resolveCurrentStudioPersistenceStateFromCapture === 'function'
        ? options.resolveCurrentStudioPersistenceStateFromCapture
        : null;
    return {
      resolveCurrentStudioPersistenceStateFromCapture: (...args) =>
        resolveCurrentStudioPersistenceStateFromCapture
          ? resolveCurrentStudioPersistenceStateFromCapture(...args)
          : null
    };
  }

  return {
    createStudioEditorPersistenceCaptureAction,
    createStudioEditorPersistenceCaptureGlobalApi
  };
}));
