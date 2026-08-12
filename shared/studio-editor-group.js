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

  function buildStudioGroupSelectionActionState(elements = [], options = {}) {
    const resolvedDoc = options.doc || null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLiveSelectedElements = typeof options.getLiveSelectedElements === 'function'
      ? options.getLiveSelectedElements
      : (selection) => selection;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : () => [];
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const slide = getActiveSlide(resolvedDoc);
    const selection = getLiveSelectedElements(elements, resolvedDoc);
    if (!resolvedDoc || !slide || selection.length < 2) {
      return {
        slide,
        selection,
        layoutItems: [],
        parent: null,
        groupPlan: {
          canGroup: false,
          selection: [],
          bounds: null,
          nextItems: []
        },
        canGroup: false
      };
    }

    const slideMetrics = getSlideMetrics(slide);
    const layoutItems = buildPositionedLayoutItems(selection, {
      getClosestPositionedAncestor,
      getRectOnSlide,
      slideMetrics
    });
    const parent = getClosestPositionedAncestor(selection[0]);
    const sameDirectParent = !!parent && selection.every((element) => {
      return element.parentElement === parent
        && getClosestPositionedAncestor(element) === parent;
    });
    const groupPlan = buildStudioGroupPlan(layoutItems, {
      isLocked: options.isLocked,
      isFreeformPositioned: options.isFreeformPositioned
    });

    return {
      slide,
      selection,
      layoutItems,
      parent: sameDirectParent ? parent : null,
      groupPlan,
      canGroup: !!(sameDirectParent
        && groupPlan.canGroup
        && groupPlan.selection.length === selection.length)
    };
  }

  function createStudioGroupSelectionActionStateBuilder(options = {}) {
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
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : () => [];
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => (typeof options.isLocked === 'function' ? options.isLocked : () => false);
    const getFreeformPositioned = typeof options.getFreeformPositioned === 'function'
      ? options.getFreeformPositioned
      : null;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => true;

    return function buildStudioEditorGroupSelectionActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      const documentFreeformPositioned = getFreeformPositioned
        ? getFreeformPositioned(resolvedDoc)
        : null;
      return buildStudioGroupSelectionActionState(getSelectedElements(resolvedDoc), {
        doc: resolvedDoc,
        getActiveSlide,
        getLiveSelectedElements,
        getSlideMetrics,
        buildPositionedLayoutItems,
        getClosestPositionedAncestor,
        getRectOnSlide,
        isLocked: getLockedState(resolvedDoc),
        isFreeformPositioned: typeof documentFreeformPositioned === 'function'
          ? documentFreeformPositioned
          : isFreeformPositioned
      });
    };
  }

  function buildStudioUngroupSelectionActionState(elements = [], options = {}) {
    const resolvedDoc = options.doc || null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLiveSelectedElements = typeof options.getLiveSelectedElements === 'function'
      ? options.getLiveSelectedElements
      : (selection) => selection;
    const isEditorGroupElement = typeof options.isEditorGroupElement === 'function'
      ? options.isEditorGroupElement
      : () => false;
    const slide = getActiveSlide(resolvedDoc);
    const selection = getLiveSelectedElements(elements, resolvedDoc);
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

  function createStudioUngroupSelectionActionStateBuilder(options = {}) {
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

    return function buildStudioEditorUngroupSelectionActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      return buildStudioUngroupSelectionActionState(getSelectedElements(resolvedDoc), {
        doc: resolvedDoc,
        getActiveSlide,
        getLiveSelectedElements,
        isEditorGroupElement
      });
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

  function buildStudioGroupToolbarState(options = {}) {
    return {
      canGroup: !!options.canGroup,
      canUngroup: !!options.canUngroup
    };
  }

  function syncStudioGroupToolbarState(options = {}) {
    const actionState = buildStudioGroupToolbarState(options);
    return renderStudioGroupToolbarState({
      documentRef: options.documentRef,
      ...actionState
    });
  }

  function createStudioGroupToolbarStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getGroupActionState = typeof options.getGroupActionState === 'function'
      ? options.getGroupActionState
      : () => ({ canGroup: false });
    const getUngroupActionState = typeof options.getUngroupActionState === 'function'
      ? options.getUngroupActionState
      : () => ({ canUngroup: false });
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorGroupToolbarState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const groupActionState = getGroupActionState(resolvedDoc) || {};
        const ungroupActionState = getUngroupActionState(resolvedDoc) || {};
        return renderStudioGroupToolbarState({
          documentRef: getDocumentRef(),
          canGroup: !!groupActionState.canGroup,
          canUngroup: !!ungroupActionState.canUngroup
        });
      } catch (error) {
        return false;
      }
    };
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

  function applyStudioUngroupMutation(options = {}) {
    const groups = Array.isArray(options.groups) ? options.groups : [];
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const slideMetrics = options.slideMetrics || {};
    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const buildUngroupedLayout = typeof options.buildUngroupedLayout === 'function'
      ? options.buildUngroupedLayout
      : buildStudioUngroupedLayout;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (groups.length === 0) {
      return {
        didApply: false,
        restoredElements: [],
        restoredGroups: [],
        transaction: null
      };
    }

    const markupCaptureTargets = [];
    if (createMarkupTransactionCapture) {
      const parentSet = new Set();
      groups.forEach((group) => {
        const parent = group && group.parentElement;
        if (!parent || parentSet.has(parent)) return;
        parentSet.add(parent);
        markupCaptureTargets.push({
          element: parent,
          elementId: getElementId(parent)
        });
      });
    }
    const markupCapture = createMarkupTransactionCapture
      ? createMarkupTransactionCapture(markupCaptureTargets, { getElementId })
      : null;
    const restoredElements = [];
    const restoredGroups = [];

    groups.forEach((group) => {
      const parent = group && group.parentElement;
      if (!parent
        || typeof parent.insertBefore !== 'function'
        || typeof group.getBoundingClientRect !== 'function') {
        return;
      }
      const groupBounds = getRectOnSlide(group.getBoundingClientRect(), slideMetrics);
      const parentBounds = typeof parent.getBoundingClientRect === 'function'
        ? getRectOnSlide(parent.getBoundingClientRect(), slideMetrics)
        : null;
      if (!parentBounds) return;
      const children = Array.from(group.children || []);
      const childItems = children.map((element) => {
        const childBounds = typeof element.getBoundingClientRect === 'function'
          ? getRectOnSlide(element.getBoundingClientRect(), slideMetrics)
          : null;
        if (!childBounds) return null;
        return {
          element,
          relativeLeft: childBounds.left - groupBounds.left,
          relativeTop: childBounds.top - groupBounds.top,
          parentLeft: parentBounds.left,
          parentTop: parentBounds.top
        };
      });
      if (childItems.some((item) => !item)) return;
      const ungroupPlan = buildUngroupedLayout(groupBounds, childItems);
      if (!ungroupPlan.canUngroup) return;

      const itemByElement = new Map(ungroupPlan.nextItems.map((item) => [item.element, item]));
      const restoredGroupElements = [];
      children.forEach((element) => {
        const item = itemByElement.get(element);
        if (!item) return;
        element.style.position = 'absolute';
        element.style.margin = '0';
        element.style.left = `${item.nextLeft}px`;
        element.style.top = `${item.nextTop}px`;
        parent.insertBefore(element, group);
        restoredElements.push(element);
        restoredGroupElements.push(element);
      });
      if (typeof group.remove === 'function') {
        group.remove();
      }
      if (restoredGroupElements.length > 0) {
        restoredGroups.push({
          group,
          parent,
          restoredElements: restoredGroupElements
        });
      }
    });

    return {
      didApply: restoredElements.length > 0,
      restoredElements,
      restoredGroups,
      transaction: restoredElements.length > 0 && markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    getStudioGroupableSelection,
    buildStudioGroupPlan,
    buildStudioGroupSelectionActionState,
    createStudioGroupSelectionActionStateBuilder,
    buildStudioUngroupSelectionActionState,
    createStudioUngroupSelectionActionStateBuilder,
    buildStudioGroupToolbarState,
    renderStudioGroupToolbarState,
    syncStudioGroupToolbarState,
    createStudioGroupToolbarStateSync,
    buildStudioUngroupedLayout,
    applyStudioGroupMutation,
    applyStudioUngroupMutation
  };
});
