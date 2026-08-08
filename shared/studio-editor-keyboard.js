(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorKeyboard = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioTypingContext(activeElement) {
    if (!activeElement) return false;
    const tagName = typeof activeElement.tagName === 'string'
      ? activeElement.tagName.toUpperCase()
      : '';
    return tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT'
      || activeElement.isContentEditable === true
      || activeElement.contentEditable === 'true';
  }

  return {
    isStudioTypingContext
  };
});
