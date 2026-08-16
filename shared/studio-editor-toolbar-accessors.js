(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorToolbarAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorToolbarAccessors(options = {}) {
    const gridSnapController = options.gridSnapController || null;
    const themeController = options.themeController || null;
    const alignmentController = options.alignmentController || null;
    const groupController = options.groupController || null;
    const nudgeController = options.nudgeController || null;
    const arrangeElementLayer = typeof options.arrangeElementLayer === 'function'
      ? options.arrangeElementLayer
      : null;
    const toggleSelectedElementsLockState = typeof options.toggleSelectedElementsLockState === 'function'
      ? options.toggleSelectedElementsLockState
      : null;
    const toggleSelectedElementsVisibility = typeof options.toggleSelectedElementsVisibility === 'function'
      ? options.toggleSelectedElementsVisibility
      : null;
    const removeSelectedElement = typeof options.removeSelectedElement === 'function'
      ? options.removeSelectedElement
      : null;
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : null;

    function call(controller, methodName, fallback, ...args) {
      return controller && typeof controller[methodName] === 'function'
        ? controller[methodName](...args)
        : fallback;
    }

    function callAction(action, fallback, ...args) {
      return typeof action === 'function' ? action(...args) : fallback;
    }

    return {
      gridSnapController,
      themeController,
      alignmentController,
      groupController,
      nudgeController,
      updateGridSnapActionState: () => call(gridSnapController, 'sync', false),
      toggleGridSnap: () => call(gridSnapController, 'toggle', false),
      alignSelectedElements: (action) => call(alignmentController, 'align', false, action),
      distributeSelectedElements: (axis) => call(alignmentController, 'distribute', false, axis),
      groupSelectedElements: () => call(groupController, 'group', false),
      ungroupSelectedElements: () => call(groupController, 'ungroup', false),
      nudgeSelectedElements: (dx, dy) => call(nudgeController, 'nudge', false, dx, dy),
      arrangeElementLayer: (action) => arrangeElementLayer ? arrangeElementLayer(action) : false,
      toggleSelectedElementsLockState: (...args) => callAction(toggleSelectedElementsLockState, false, ...args),
      toggleSelectedElementsVisibility: (...args) => callAction(toggleSelectedElementsVisibility, false, ...args),
      removeSelectedElement: (...args) => callAction(removeSelectedElement, false, ...args),
      deselectElement: (...args) => callAction(deselectElement, false, ...args),
      toggleGlobalTheme: () => call(themeController, 'toggleGlobalTheme', false),
      syncIframeTheme: () => call(themeController, 'syncIframeTheme', false),
      bindStudioEditorLayoutControls: (options = {}) => {
        const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
        if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

        const bindings = {};
        const buttonHandlers = [
          ['alignSelectionLeftBtn', () => call(alignmentController, 'align', false, 'left')],
          ['alignSelectionCenterBtn', () => call(alignmentController, 'align', false, 'center')],
          ['alignSelectionRightBtn', () => call(alignmentController, 'align', false, 'right')],
          ['alignSelectionTopBtn', () => call(alignmentController, 'align', false, 'top')],
          ['alignSelectionMiddleBtn', () => call(alignmentController, 'align', false, 'middle')],
          ['alignSelectionBottomBtn', () => call(alignmentController, 'align', false, 'bottom')],
          ['distributeSelectionHorizontalBtn', () => call(alignmentController, 'distribute', false, 'horizontal')],
          ['distributeSelectionVerticalBtn', () => call(alignmentController, 'distribute', false, 'vertical')],
          ['groupSelectionBtn', () => call(groupController, 'group', false)],
          ['ungroupSelectionBtn', () => call(groupController, 'ungroup', false)],
          ['nudgeSelectionUpBtn', () => call(nudgeController, 'nudge', false, 0, -1)],
          ['nudgeSelectionLeftBtn', () => call(nudgeController, 'nudge', false, -1, 0)],
          ['nudgeSelectionRightBtn', () => call(nudgeController, 'nudge', false, 1, 0)],
          ['nudgeSelectionDownBtn', () => call(nudgeController, 'nudge', false, 0, 1)],
          ['arrangeLayerFrontBtn', () => arrangeElementLayer ? arrangeElementLayer('front') : false],
          ['arrangeLayerBackBtn', () => arrangeElementLayer ? arrangeElementLayer('back') : false],
          ['arrangeLayerForwardBtn', () => arrangeElementLayer ? arrangeElementLayer('forward') : false],
          ['arrangeLayerBackwardBtn', () => arrangeElementLayer ? arrangeElementLayer('backward') : false],
          ['toggleGridSnapBtn', () => call(gridSnapController, 'toggle', false)]
        ];
        buttonHandlers.forEach(([id, handler]) => {
          const button = documentRef.getElementById(id);
          if (!button || typeof button.addEventListener !== 'function') {
            bindings[id] = false;
            return;
          }
          button.addEventListener('click', handler);
          bindings[id] = true;
        });
        return bindings;
      },
      bindStudioEditorSelectionControls: (options = {}) => {
        const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
        if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

        const bindings = {};
        const buttonHandlers = [
          ['toggleLockSelectionBtn', () => callAction(toggleSelectedElementsLockState, false)],
          ['toggleVisibilitySelectionBtn', () => callAction(toggleSelectedElementsVisibility, false)],
          ['removeSelectionBtn', () => callAction(removeSelectedElement, false)],
          ['deselectSelectionBtn', () => callAction(deselectElement, false)]
        ];
        buttonHandlers.forEach(([id, handler]) => {
          const button = documentRef.getElementById(id);
          if (!button || typeof button.addEventListener !== 'function') {
            bindings[id] = false;
            return;
          }
          button.addEventListener('click', handler);
          bindings[id] = true;
        });
        return bindings;
      }
    };
  }

  function createStudioEditorToolbarGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorToolbarAccessors(options);

    return {
      updateGridSnapActionState: () => accessors.updateGridSnapActionState(),
      toggleGridSnap: () => accessors.toggleGridSnap(),
      alignSelectedElements: (action) => typeof accessors.alignSelectedElements === 'function'
        ? accessors.alignSelectedElements(action)
        : false,
      distributeSelectedElements: (axis) => typeof accessors.distributeSelectedElements === 'function'
        ? accessors.distributeSelectedElements(axis)
        : false,
      groupSelectedElements: () => typeof accessors.groupSelectedElements === 'function'
        ? accessors.groupSelectedElements()
        : false,
      ungroupSelectedElements: () => typeof accessors.ungroupSelectedElements === 'function'
        ? accessors.ungroupSelectedElements()
        : false,
      nudgeSelectedElements: (dx, dy) => typeof accessors.nudgeSelectedElements === 'function'
        ? accessors.nudgeSelectedElements(dx, dy)
        : false,
      arrangeElementLayer: (action) => typeof accessors.arrangeElementLayer === 'function'
        ? accessors.arrangeElementLayer(action)
        : false,
      toggleGlobalTheme: () => accessors.toggleGlobalTheme(),
      syncIframeTheme: () => accessors.syncIframeTheme()
    };
  }

  return {
    createStudioEditorToolbarAccessors,
    createStudioEditorToolbarGlobalApi
  };
});
