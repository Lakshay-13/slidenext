(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayerShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorLayerAccessors'
    );
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorLayerAccessors === 'function'
      ? accessorsApi.createStudioEditorLayerAccessors({
          controller: resolveApi(
            options,
            'controller',
            'SlideNextStudioEditorLayerController'
          ),
          deckMutationApi: resolveApi(
            options,
            'deckMutationApi',
            'SlideNextStudioEditorDeckMutation'
          ),
          mutationApi: resolveApi(
            options,
            'mutationApi',
            'SlideNextStudioEditorMutation'
          ),
          getCanonicalDeckValidator: options.getCanonicalDeckValidator,
          finalizeMutation: options.finalizeMutation,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          documentRef: options.documentRef,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          buildEditorDeckSnapshot: options.buildEditorDeckSnapshot,
          getSelectedElementIds: options.getSelectedElementIds,
          getElementByEditorId: options.getElementByEditorId,
          buildLayerOrderSelectionActionState: options.buildLayerOrderSelectionActionState,
          updateLayersList: options.updateLayersList,
          updateLayerOrderActionState: options.updateLayerOrderActionState,
          getSelectedElements: options.getSelectedElements,
          getLiveSelectedElements: options.getLiveSelectedElements,
          selectElement: options.selectElement,
          getCommittedSelectedEditorElementIds: options.getCommittedSelectedEditorElementIds,
          deselectElement: options.deselectElement,
          restoreCommittedSelectionByIdsOnActiveSlide:
            options.restoreCommittedSelectionByIdsOnActiveSlide,
          applyEditorSelectionState: options.applyEditorSelectionState,
          refreshSelectionClasses: options.refreshSelectionClasses,
          toggleSelectedElementsVisibility: options.toggleSelectedElementsVisibility,
          refreshLayerOrderUi: options.refreshLayerOrderUi,
          isElementLocked: options.isElementLocked,
          reorderSlideLayers: options.reorderSlideLayers,
          liveSelectionApi: resolveApi(
            options,
            'liveSelectionApi',
            'SlideNextStudioEditorLiveSelection'
          ),
          layerOrderApi: resolveApi(
            options,
            'layerOrderApi',
            'SlideNextStudioEditorLayerOrder'
          ),
          getLayerOrderZIndexSynchronizer: options.getLayerOrderZIndexSynchronizer,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          buildCanonicalDeck: options.buildCanonicalDeck,
          resolveCanonicalNode: options.resolveCanonicalNode,
          syncLayerOrderZIndexInput: options.syncLayerOrderZIndexInput,
          finalizeLayerOrderMutation: options.finalizeLayerOrderMutation,
          rollbackLayerOrderMutation: options.rollbackLayerOrderMutation
        })
      : null;
    const globalApi = accessorsApi
      && typeof accessorsApi.createStudioEditorLayerGlobalApi === 'function'
      ? accessorsApi.createStudioEditorLayerGlobalApi({ accessors })
      : {};

    return {
      accessors,
      globalApi
    };
  }

  return {
    createStudioEditorLayerShellComposition
  };
});
