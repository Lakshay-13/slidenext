(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroup = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioGroupableSelection(items = [], options = {}) {
    const selection = Array.isArray(items) ? items : [];
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => true;

    return selection.filter((item) => {
      const element = item && item.element ? item.element : item;
      return !!item && !isLocked(element) && isFreeformPositioned(element);
    });
  }

  function isValidGroupItem(item) {
    return item
      && Number.isFinite(item.absLeft)
      && Number.isFinite(item.absTop)
      && Number.isFinite(item.width)
      && Number.isFinite(item.height)
      && Number.isFinite(item.parentLeft)
      && Number.isFinite(item.parentTop);
  }

  function buildStudioGroupPlan(items = [], options = {}) {
    const selection = getStudioGroupableSelection(items, options);
    if (selection.length < 2 || !selection.every(isValidGroupItem)) {
      return {
        canGroup: false,
        selection,
        bounds: null,
        nextItems: []
      };
    }

    const left = Math.min(...selection.map((item) => item.absLeft));
    const top = Math.min(...selection.map((item) => item.absTop));
    const right = Math.max(...selection.map((item) => item.absLeft + item.width));
    const bottom = Math.max(...selection.map((item) => item.absTop + item.height));
    const nextItems = selection.map((item) => ({
      ...item,
      nextAbsLeft: item.absLeft,
      nextAbsTop: item.absTop,
      nextLeft: item.absLeft - left,
      nextTop: item.absTop - top
    }));

    return {
      canGroup: true,
      selection,
      bounds: {
        left,
        top,
        width: right - left,
        height: bottom - top
      },
      nextItems
    };
  }

  function renderStudioGroupToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const groupButton = documentRef.getElementById('groupSelectionBtn');
    const ungroupButton = documentRef.getElementById('ungroupSelectionBtn');
    if (groupButton) groupButton.disabled = !options.canGroup;
    if (ungroupButton) ungroupButton.disabled = !options.canUngroup;
    return true;
  }

  function buildStudioUngroupedLayout(groupBounds = {}, items = []) {
    const layoutItems = Array.isArray(items) ? items : [];
    if (!Number.isFinite(groupBounds.left)
      || !Number.isFinite(groupBounds.top)
      || layoutItems.length === 0
      || !layoutItems.every((item) => item
        && Number.isFinite(item.relativeLeft)
        && Number.isFinite(item.relativeTop)
        && Number.isFinite(item.parentLeft)
        && Number.isFinite(item.parentTop))) {
      return {
        canUngroup: false,
        nextItems: []
      };
    }

    return {
      canUngroup: true,
      nextItems: layoutItems.map((item) => {
        const nextAbsLeft = groupBounds.left + item.relativeLeft;
        const nextAbsTop = groupBounds.top + item.relativeTop;
        return {
          ...item,
          nextAbsLeft,
          nextAbsTop,
          nextLeft: nextAbsLeft - item.parentLeft,
          nextTop: nextAbsTop - item.parentTop
        };
      })
    };
  }

  return {
    getStudioGroupableSelection,
    buildStudioGroupPlan,
    renderStudioGroupToolbarState,
    buildStudioUngroupedLayout
  };
});
