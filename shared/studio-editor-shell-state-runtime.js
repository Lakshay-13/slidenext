(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function createBridge(api, factoryName, options) {
    return api && typeof api[factoryName] === 'function'
      ? api[factoryName](options)
      : null;
  }

  function createStudioEditorShellStateRuntime(options = {}) {
    const sessionStateBridge = createBridge(
      resolveApi(options.sessionStateBridgeApi, 'SlideNextStudioEditorSessionStateBridge'),
      'createStudioEditorSessionStateBridge',
      {
        runtimeApi: resolveApi(options.sessionStateRuntimeApi, 'SlideNextStudioEditorSessionStateRuntime'),
        controllerApi: resolveApi(options.sessionStateControllerApi, 'SlideNextStudioEditorSessionState')
      }
    );
    const sessionStateAccessors = createBridge(
      resolveApi(options.sessionStateAccessorsApi, 'SlideNextStudioEditorSessionStateAccessors'),
      'createStudioEditorSessionStateAccessors',
      { bridge: sessionStateBridge }
    );
    const stateBridge = createBridge(
      resolveApi(options.stateBridgeApi, 'SlideNextStudioEditorStateBridge'),
      'createStudioEditorStateBridge',
      {
        runtimeApi: resolveApi(options.stateRuntimeApi, 'SlideNextStudioEditorStateRuntime'),
        presentationMetadataApi: resolveApi(
          options.presentationMetadataApi,
          'SlideNextStudioEditorPresentationMetadataStateStore'
        ),
        presentationLabelApi: resolveApi(
          options.presentationLabelApi,
          'SlideNextStudioEditorPresentationLabelStateStore'
        ),
        slideIndexApi: resolveApi(options.slideIndexApi, 'SlideNextStudioEditorSlideIndexStore'),
        selectionApi: resolveApi(options.selectionApi, 'SlideNextStudioEditorSelectionStateStore'),
        getElementId: options.getElementId
      }
    );
    const stateAccessors = createBridge(
      resolveApi(options.stateAccessorsApi, 'SlideNextStudioEditorStateAccessors'),
      'createStudioEditorStateAccessors',
      {
        bridge: stateBridge,
        getDocument: options.getDocument,
        getActiveSlide: options.getActiveSlide,
        getElementById: options.getElementById
      }
    );
    const historyBridge = createBridge(
      resolveApi(options.historyBridgeApi, 'SlideNextStudioEditorHistoryBridge'),
      'createStudioEditorHistoryBridge',
      {
        runtimeApi: resolveApi(options.historyRuntimeApi, 'SlideNextStudioEditorHistoryRuntime'),
        historyStore: resolveApi(options.historyStoreApi, 'SlideNextStudioEditorHistoryStore')
      }
    );
    const historyAccessors = createBridge(
      resolveApi(options.historyAccessorsApi, 'SlideNextStudioEditorHistoryAccessors'),
      'createStudioEditorHistoryAccessors',
      { bridge: historyBridge }
    );
    const persistedDeckBridge = createBridge(
      resolveApi(
        options.persistedDeckBridgeApi,
        'SlideNextStudioEditorPersistedDeckBridge'
      ),
      'createStudioEditorPersistedDeckBridge',
      {
        runtimeApi: resolveApi(
          options.persistedDeckRuntimeApi,
          'SlideNextStudioEditorPersistedDeckRuntime'
        ),
        stateStore: resolveApi(
          options.persistedDeckStateStoreApi,
          'SlideNextStudioEditorPersistedDeckStateStore'
        )
      }
    );
    const persistedDeckAccessors = createBridge(
      resolveApi(
        options.persistedDeckAccessorsApi,
        'SlideNextStudioEditorPersistedDeckAccessors'
      ),
      'createStudioEditorPersistedDeckAccessors',
      { bridge: persistedDeckBridge }
    );
    const timerStateBridge = createBridge(
      resolveApi(options.timerStateBridgeApi, 'SlideNextStudioEditorTimerStateBridge'),
      'createStudioEditorTimerStateBridge',
      {
        autoSaveRuntimeApi: resolveApi(
          options.autoSaveTimerRuntimeApi,
          'SlideNextStudioEditorAutoSaveTimerRuntime'
        ),
        autoSaveStateStore: resolveApi(
          options.autoSaveTimerStoreApi,
          'SlideNextStudioEditorAutoSaveTimerStore'
        ),
        autoVersionRuntimeApi: resolveApi(
          options.autoVersionTimerRuntimeApi,
          'SlideNextStudioEditorAutoVersionTimerRuntime'
        ),
        autoVersionStateStore: resolveApi(
          options.autoVersionTimerStoreApi,
          'SlideNextStudioEditorAutoVersionTimerStore'
        )
      }
    );
    const timerStateAccessors = createBridge(
      resolveApi(options.timerStateAccessorsApi, 'SlideNextStudioEditorTimerStateAccessors'),
      'createStudioEditorTimerStateAccessors',
      { bridge: timerStateBridge }
    );
    const saveButtonStateRuntime = createBridge(
      resolveApi(
        options.saveButtonStateRuntimeApi,
        'SlideNextStudioEditorSaveButtonStateRuntime'
      ),
      'createStudioEditorSaveButtonStateRuntime',
      {
        stateStore: resolveApi(
          options.saveButtonStateStoreApi,
          'SlideNextStudioEditorSaveButtonStateStore'
        )
      }
    );
    const saveButtonStateStore = saveButtonStateRuntime
      ? saveButtonStateRuntime.saveButtonStateStore
      : null;
    const saveButtonStateBridge = createBridge(
      resolveApi(
        options.saveButtonStateBridgeApi,
        'SlideNextStudioEditorSaveButtonStateBridge'
      ),
      'createStudioEditorSaveButtonStateBridge',
      { stateStore: saveButtonStateStore }
    );
    const saveButtonStateAccessors = createBridge(
      resolveApi(
        options.saveButtonStateAccessorsApi,
        'SlideNextStudioEditorSaveButtonStateAccessors'
      ),
      'createStudioEditorSaveButtonStateAccessors',
      { bridge: saveButtonStateBridge }
    );
    const wallpaperStateRuntime = createBridge(
      resolveApi(options.wallpaperStateRuntimeApi, 'SlideNextStudioEditorWallpaperStateRuntime'),
      'createStudioEditorWallpaperStateRuntime',
      {
        stateStore: resolveApi(
          options.wallpaperStateStoreApi,
          'SlideNextStudioEditorWallpaperStateStore'
        )
      }
    );
    const wallpaperStateStore = wallpaperStateRuntime
      ? wallpaperStateRuntime.wallpaperStateStore
      : null;
    const wallpaperStateBridge = createBridge(
      resolveApi(options.wallpaperStateBridgeApi, 'SlideNextStudioEditorWallpaperStateBridge'),
      'createStudioEditorWallpaperStateBridge',
      { stateStore: wallpaperStateStore }
    );
    const wallpaperStateAccessors = createBridge(
      resolveApi(options.wallpaperStateAccessorsApi, 'SlideNextStudioEditorWallpaperStateAccessors'),
      'createStudioEditorWallpaperStateAccessors',
      { bridge: wallpaperStateBridge }
    );

    return {
      sessionStateBridge,
      sessionStateAccessors,
      stateBridge,
      stateAccessors,
      historyBridge,
      historyAccessors,
      persistedDeckBridge,
      persistedDeckAccessors,
      timerStateBridge,
      timerStateAccessors,
      saveButtonStateRuntime,
      saveButtonStateStore,
      saveButtonStateBridge,
      saveButtonStateAccessors,
      wallpaperStateRuntime,
      wallpaperStateStore,
      wallpaperStateBridge,
      wallpaperStateAccessors
    };
  }

  return {
    createStudioEditorShellStateRuntime
  };
});
