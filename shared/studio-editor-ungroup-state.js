(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUngroupState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorUngroupStateController(options = {}) {
    const groupApi = options.groupApi && typeof options.groupApi === 'object'
      ? options.groupApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLiveSelectedElements = typeof options.getLiveSelectedElements === 'function'
      ? options.getLiveSelectedElements
      : (selection) => selection;
    const isEditorGroupElement = typeof options.isEditorGroupElement === 'function'
      ? options.isEditorGroupElement
      : () => false;
    const injectedActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : null;
    let actionStateBuilder = null;

    function buildActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      if (injectedActionState) {
        try {
          return injectedActionState(resolvedDoc) || {
            slide: null,
            selection: [],
            groups: [],
            canUngroup: false
          };
        } catch (error) {
          return {
            slide: null,
            selection: [],
            groups: [],
            canUngroup: false
          };
        }
      }

      if (groupApi && typeof groupApi.createStudioUngroupSelectionActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          try {
            actionStateBuilder = groupApi.createStudioUngroupSelectionActionStateBuilder({
              getDocument,
              getSelectedElements,
              getActiveSlide,
              getLiveSelectedElements,
              isEditorGroupElement
            });
          } catch (error) {
            actionStateBuilder = null;
          }
        }
        if (typeof actionStateBuilder === 'function') {
          try {
            return actionStateBuilder(resolvedDoc);
          } catch (error) {
            return {
              slide: null,
              selection: [],
              groups: [],
              canUngroup: false
            };
          }
        }
      }

      if (groupApi && typeof groupApi.buildStudioUngroupSelectionActionState === 'function') {
        try {
          return groupApi.buildStudioUngroupSelectionActionState(
            getSelectedElements(resolvedDoc),
            {
              doc: resolvedDoc,
              getActiveSlide,
              getLiveSelectedElements,
              isEditorGroupElement
            }
          );
        } catch (error) {
          return {
            slide: null,
            selection: [],
            groups: [],
            canUngroup: false
          };
        }
      }

      let slide = null;
      let selection = [];
      try {
        slide = getActiveSlide(resolvedDoc);
        selection = getLiveSelectedElements(getSelectedElements(resolvedDoc), resolvedDoc) || [];
      } catch (error) {
        return {
          slide: null,
          selection: [],
          groups: [],
          canUngroup: false
        };
      }
      const groups = selection.filter(isEditorGroupElement).filter((group) => {
        return !!(group.parentElement && group.children && group.children.length > 0);
      });
      return {
        slide,
        selection,
        groups,
        canUngroup: !!(slide && selection.length > 0 && groups.length === selection.length)
      };
    }

    return {
      buildActionState
    };
  }

  return {
    createStudioEditorUngroupStateController
  };
});
