(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignment = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ALIGNMENT_ACTIONS = new Set(['left', 'center', 'right', 'top', 'middle', 'bottom']);

  function getStudioAlignmentSelection(items = [], options = {}) {
    const selection = Array.isArray(items) ? items : [];
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;

    return selection.filter((item) => {
      const element = item && item.element ? item.element : item;
      return !!item && !isLocked(element);
    });
  }

  function buildStudioAlignmentActionState(items = [], options = {}) {
    const selection = getStudioAlignmentSelection(items, options);
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    return {
      selection,
      canAlign: canMutateDeck() && selection.length >= 2
    };
  }

  function renderStudioAlignmentToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const canAlign = !!options.canAlign;
    const canDistribute = canAlign && Number.isInteger(options.selectionCount)
      && options.selectionCount >= 3;
    [
      'alignSelectionLeftBtn',
      'alignSelectionCenterBtn',
      'alignSelectionRightBtn',
      'alignSelectionTopBtn',
      'alignSelectionMiddleBtn',
      'alignSelectionBottomBtn'
    ].forEach((id) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canAlign;
    });
    ['distributeSelectionHorizontalBtn', 'distributeSelectionVerticalBtn'].forEach((id) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canDistribute;
    });
    return true;
  }

  function syncStudioAlignmentToolbarState(options = {}) {
    const actionState = buildStudioAlignmentActionState(options.items, {
      isLocked: options.isLocked,
      canMutateDeck: options.canMutateDeck
    });
    return renderStudioAlignmentToolbarState({
      documentRef: options.documentRef,
      canAlign: actionState.canAlign,
      selectionCount: actionState.selection.length
    });
  }

  function isValidAlignmentItem(item) {
    return item
      && Number.isFinite(item.absLeft)
      && Number.isFinite(item.absTop)
      && Number.isFinite(item.width)
      && Number.isFinite(item.height)
      && Number.isFinite(item.parentLeft)
      && Number.isFinite(item.parentTop);
  }

  function buildStudioAlignedLayout(items = [], action = '') {
    const layoutItems = Array.isArray(items) ? items : [];
    if (!ALIGNMENT_ACTIONS.has(action) || layoutItems.length < 2 || !layoutItems.every(isValidAlignmentItem)) {
      return {
        didChange: false,
        nextItems: layoutItems
      };
    }

    const left = Math.min(...layoutItems.map((item) => item.absLeft));
    const top = Math.min(...layoutItems.map((item) => item.absTop));
    const right = Math.max(...layoutItems.map((item) => item.absLeft + item.width));
    const bottom = Math.max(...layoutItems.map((item) => item.absTop + item.height));
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    let didChange = false;

    const nextItems = layoutItems.map((item) => {
      let nextAbsLeft = item.absLeft;
      let nextAbsTop = item.absTop;
      if (action === 'left') nextAbsLeft = left;
      if (action === 'center') nextAbsLeft = centerX - item.width / 2;
      if (action === 'right') nextAbsLeft = right - item.width;
      if (action === 'top') nextAbsTop = top;
      if (action === 'middle') nextAbsTop = centerY - item.height / 2;
      if (action === 'bottom') nextAbsTop = bottom - item.height;

      if (nextAbsLeft !== item.absLeft || nextAbsTop !== item.absTop) {
        didChange = true;
      }
      return {
        ...item,
        nextAbsLeft,
        nextAbsTop,
        nextLeft: nextAbsLeft - item.parentLeft,
        nextTop: nextAbsTop - item.parentTop
      };
    });

    return {
      didChange,
      nextItems
    };
  }

  function buildStudioDistributedLayout(items = [], axis = '') {
    const layoutItems = Array.isArray(items) ? items : [];
    if (layoutItems.length < 3 || !['horizontal', 'vertical'].includes(axis) || !layoutItems.every(isValidAlignmentItem)) {
      return {
        didChange: false,
        nextItems: layoutItems
      };
    }

    const sortedItems = [...layoutItems].sort((first, second) => axis === 'horizontal'
      ? first.absLeft - second.absLeft
      : first.absTop - second.absTop);
    const firstItem = sortedItems[0];
    const lastItem = sortedItems[sortedItems.length - 1];
    const start = axis === 'horizontal' ? firstItem.absLeft : firstItem.absTop;
    const end = axis === 'horizontal'
      ? lastItem.absLeft + lastItem.width
      : lastItem.absTop + lastItem.height;
    const totalSize = sortedItems.reduce((sum, item) => sum + (axis === 'horizontal' ? item.width : item.height), 0);
    const gap = (end - start - totalSize) / (sortedItems.length - 1);
    let cursor = start;
    const nextPositionByItem = new Map();

    sortedItems.forEach((item) => {
      nextPositionByItem.set(item, cursor);
      cursor += (axis === 'horizontal' ? item.width : item.height) + gap;
    });

    let didChange = false;
    const nextItems = layoutItems.map((item) => {
      const nextPosition = nextPositionByItem.get(item);
      const nextAbsLeft = axis === 'horizontal' ? nextPosition : item.absLeft;
      const nextAbsTop = axis === 'vertical' ? nextPosition : item.absTop;
      if (nextAbsLeft !== item.absLeft || nextAbsTop !== item.absTop) {
        didChange = true;
      }
      return {
        ...item,
        nextAbsLeft,
        nextAbsTop,
        nextLeft: nextAbsLeft - item.parentLeft,
        nextTop: nextAbsTop - item.parentTop
      };
    });

    return {
      didChange,
      nextItems
    };
  }

  function applyStudioAlignmentLayout(items = [], options = {}) {
    const nextItems = Array.isArray(items) ? items : [];
    const createPositionTransaction = typeof options.createPositionTransaction === 'function'
      ? options.createPositionTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const transaction = createPositionTransaction
      ? createPositionTransaction(nextItems, { getElementId })
      : null;
    let didApply = false;

    nextItems.forEach((item) => {
      if (!item || !item.element || !item.element.style) return;
      item.element.style.left = `${item.nextLeft}px`;
      item.element.style.top = `${item.nextTop}px`;
      didApply = true;
    });

    return {
      didApply,
      transaction
    };
  }

  return {
    getStudioAlignmentSelection,
    buildStudioAlignmentActionState,
    renderStudioAlignmentToolbarState,
    syncStudioAlignmentToolbarState,
    buildStudioAlignedLayout,
    buildStudioDistributedLayout,
    applyStudioAlignmentLayout
  };
});
