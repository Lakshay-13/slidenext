(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutConversionMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function restoreStudioLayoutConversionStyles(items = []) {
    const sourceItems = Array.isArray(items) ? items : [];
    sourceItems.forEach((item) => {
      if (!item || !item.element || !item.element.style) return;
      Object.keys(item.beforeStyle || {}).forEach((property) => {
        item.element.style[property] = item.beforeStyle[property];
      });
    });
    return true;
  }

  function applyStudioLayoutConversionStyles(items = []) {
    const sourceItems = Array.isArray(items) ? items : [];
    const appliedItems = [];
    try {
      sourceItems.forEach((item) => {
        if (!item || !item.element || !item.element.style) {
          throw new Error('conversion target has no writable style');
        }
        appliedItems.push(item);
        Object.keys(item.afterStyle || {}).forEach((property) => {
          item.element.style[property] = item.afterStyle[property];
        });
      });
      return true;
    } catch (error) {
      restoreStudioLayoutConversionStyles(appliedItems);
      return false;
    }
  }

  return {
    applyStudioLayoutConversionStyles,
    restoreStudioLayoutConversionStyles
  };
});
