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

  return {
    getStudioAlignmentSelection,
    buildStudioAlignmentActionState,
    buildStudioAlignedLayout
  };
});
