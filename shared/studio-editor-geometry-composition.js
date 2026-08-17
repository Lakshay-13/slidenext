(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGeometryComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorGeometryComposition(options = {}) {
    const freeformPositionAdapterApi = resolveApi(
      options,
      'freeformPositionAdapterApi',
      'SlideNextStudioEditorFreeformPositionAdapter'
    );
    const transformSelectionStateAdapterApi = resolveApi(
      options,
      'transformSelectionStateAdapterApi',
      'SlideNextStudioEditorTransformSelectionStateAdapter'
    );
    const positionedLayoutItemsAdapterApi = resolveApi(
      options,
      'positionedLayoutItemsAdapterApi',
      'SlideNextStudioEditorPositionedLayoutItemsAdapter'
    );
    const closestPositionedAncestorAdapterApi = resolveApi(
      options,
      'closestPositionedAncestorAdapterApi',
      'SlideNextStudioEditorClosestPositionedAncestorAdapter'
    );
    const transformApi = resolveApi(
      options,
      'transformApi',
      'SlideNextStudioEditorTransform'
    );
    const domApi = resolveApi(options, 'domApi', 'SlideNextStudioEditorDom');

    const freeformPositionReader = freeformPositionAdapterApi
      && typeof freeformPositionAdapterApi.isStudioEditorFreeformPositioned === 'function'
      && transformApi
      && typeof transformApi.isStudioFreeformPositioned === 'function'
      ? (element, positionOptions) => freeformPositionAdapterApi.isStudioEditorFreeformPositioned(
          element,
          {
            transformApi,
            positionOptions
          }
        )
      : null;

    const transformSelectionStateBuilder = transformSelectionStateAdapterApi
      && typeof transformSelectionStateAdapterApi.buildStudioEditorTransformSelectionState === 'function'
      && transformApi
      && typeof transformApi.buildStudioTransformSelectionState === 'function'
      ? (elements, selectionOptions) => transformSelectionStateAdapterApi
        .buildStudioEditorTransformSelectionState(
          elements,
          {
            transformApi,
            selectionOptions
          }
        )
      : null;

    const positionedLayoutItemsBuilder = positionedLayoutItemsAdapterApi
      && typeof positionedLayoutItemsAdapterApi.buildStudioEditorPositionedLayoutItems === 'function'
      && transformApi
      && typeof transformApi.buildStudioPositionedLayoutItems === 'function'
      ? (elements, layoutOptions) => positionedLayoutItemsAdapterApi
        .buildStudioEditorPositionedLayoutItems(
          elements,
          {
            transformApi,
            layoutOptions
          }
        )
      : null;

    const closestPositionedAncestorResolver = closestPositionedAncestorAdapterApi
      && typeof closestPositionedAncestorAdapterApi.getStudioEditorClosestPositionedAncestor === 'function'
      && domApi
      && typeof domApi.getStudioClosestPositionedAncestor === 'function'
      ? (element) => closestPositionedAncestorAdapterApi
        .getStudioEditorClosestPositionedAncestor(element, { domApi })
      : null;

    return {
      freeformPositionReader,
      transformSelectionStateBuilder,
      positionedLayoutItemsBuilder,
      closestPositionedAncestorResolver
    };
  }

  return {
    createStudioEditorGeometryComposition
  };
});
