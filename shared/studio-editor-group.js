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

  function applyStudioGroupMutation(options = {}) {
    const documentRef = options.documentRef;
    const parent = options.parent || null;
    const groupPlan = options.groupPlan || null;
    const parentBounds = options.parentBounds || {};
    const orderedSelection = Array.isArray(options.orderedSelection)
      ? options.orderedSelection
      : [];
    if (!documentRef
      || typeof documentRef.createElement !== 'function'
      || !parent
      || typeof parent.appendChild !== 'function'
      || !groupPlan
      || !groupPlan.bounds
      || !Number.isFinite(parentBounds.left)
      || !Number.isFinite(parentBounds.top)
      || !Array.isArray(groupPlan.nextItems)
      || orderedSelection.length === 0) {
      return {
        didApply: false,
        group: null,
        transaction: null
      };
    }

    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const markupCapture = createMarkupTransactionCapture
      ? createMarkupTransactionCapture([{
          element: parent,
          elementId: getElementId(parent)
        }], { getElementId })
      : null;

    const group = documentRef.createElement('div');
    if (!group || typeof group.appendChild !== 'function') {
      return {
        didApply: false,
        group: null,
        transaction: null
      };
    }
    group.className = 'editor-group editor-hoverable';
    if (typeof group.setAttribute === 'function') {
      group.setAttribute('data-editor-group', 'true');
    }
    group.style.position = 'absolute';
    group.style.left = `${groupPlan.bounds.left - parentBounds.left}px`;
    group.style.top = `${groupPlan.bounds.top - parentBounds.top}px`;
    group.style.width = `${groupPlan.bounds.width}px`;
    group.style.height = `${groupPlan.bounds.height}px`;
    group.style.overflow = 'visible';
    group.style.boxSizing = 'border-box';

    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : null;
    if (assignElementId) {
      assignElementId(group);
    }

    const itemByElement = new Map(groupPlan.nextItems.map((item) => [item.element, item]));
    const firstElement = orderedSelection[0];
    if (firstElement
      && firstElement.parentElement === parent
      && typeof parent.insertBefore === 'function') {
      parent.insertBefore(group, firstElement);
    } else {
      parent.appendChild(group);
    }

    orderedSelection.forEach((element) => {
      const item = itemByElement.get(element);
      if (!item) return;
      element.style.position = 'absolute';
      element.style.margin = '0';
      element.style.left = `${item.nextLeft}px`;
      element.style.top = `${item.nextTop}px`;
      group.appendChild(element);
    });

    const prepareGroup = typeof options.prepareGroup === 'function'
      ? options.prepareGroup
      : null;
    if (prepareGroup) {
      prepareGroup(group);
    }

    return {
      didApply: true,
      group,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    getStudioGroupableSelection,
    buildStudioGroupPlan,
    renderStudioGroupToolbarState,
    buildStudioUngroupedLayout,
    applyStudioGroupMutation
  };
});
