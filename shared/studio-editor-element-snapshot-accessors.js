(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementSnapshotAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const EMPTY_SNAPSHOT = {
    id: '',
    typeIcon: 'description',
    displayName: 'Element',
    zIndex: '0',
    isLocked: false,
    isHidden: false,
    isSelected: false
  };
  const EMPTY_DISPLAY_METADATA = {
    typeIcon: 'description',
    displayName: 'Element'
  };

  function createStudioEditorElementSnapshotAccessors(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const controller = options.controller || null;
    const snapshotApi = hasOption('snapshotApi')
      ? options.snapshotApi
      : (root && root.SlideNextStudioElementSnapshot) || null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : () => '';
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const isElementHidden = typeof options.isElementHidden === 'function'
      ? options.isElementHidden
      : () => false;
    const isSelectedElement = typeof options.isSelectedElement === 'function'
      ? options.isSelectedElement
      : () => false;

    let builder = null;

    function getBuilder() {
      if (builder || !snapshotApi
        || typeof snapshotApi.createStudioEditorElementSnapshotBuilder !== 'function') {
        return builder;
      }
      builder = snapshotApi.createStudioEditorElementSnapshotBuilder({
        getElementId,
        isElementLocked,
        isElementHidden,
        isSelectedElement
      });
      return builder;
    }

    function build(element) {
      if (controller && typeof controller.build === 'function') {
        return controller.build(element);
      }
      const snapshotBuilder = getBuilder();
      if (typeof snapshotBuilder === 'function') {
        return snapshotBuilder(element);
      }
      if (!snapshotApi || typeof snapshotApi.buildStudioElementSnapshot !== 'function') {
        return { ...EMPTY_SNAPSHOT };
      }
      return snapshotApi.buildStudioElementSnapshot(element, {
        getElementId,
        isElementLocked,
        isElementHidden,
        isSelectedElement
      });
    }

    function buildLayer(elements, layerOptions = {}) {
      if (controller && typeof controller.buildLayer === 'function') {
        return controller.buildLayer(elements, layerOptions);
      }
      if (!snapshotApi || typeof snapshotApi.buildStudioLayerSnapshot !== 'function') {
        return [];
      }
      return snapshotApi.buildStudioLayerSnapshot(elements, {
        ...layerOptions,
        buildElementSnapshot: build
      });
    }

    function getDisplayMetadata(element) {
      if (controller && typeof controller.getDisplayMetadata === 'function') {
        return controller.getDisplayMetadata(element);
      }
      if (!snapshotApi || typeof snapshotApi.resolveStudioLayerDisplayMetadata !== 'function') {
        return { ...EMPTY_DISPLAY_METADATA };
      }
      return snapshotApi.resolveStudioLayerDisplayMetadata(element);
    }

    return {
      build,
      buildLayer,
      getDisplayMetadata
    };
  }

  return {
    createStudioEditorElementSnapshotAccessors
  };
});
