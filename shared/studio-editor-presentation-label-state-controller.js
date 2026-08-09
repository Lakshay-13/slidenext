(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationLabelStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeLabel(value) {
    return typeof value === 'string' ? value : '';
  }

  function createStudioEditorPresentationLabelStateController(options = {}) {
    let title = normalizeLabel(options.initialTitle);
    let category = normalizeLabel(options.initialCategory);

    return {
      getTitle: () => title,
      setTitle(nextTitle) {
        title = normalizeLabel(nextTitle);
        return title;
      },
      getCategory: () => category,
      setCategory(nextCategory) {
        category = normalizeLabel(nextCategory);
        return category;
      },
      getState: () => ({ title, category }),
      setState(nextState = {}) {
        title = normalizeLabel(nextState.title);
        category = normalizeLabel(nextState.category);
        return { title, category };
      },
      reset() {
        title = '';
        category = '';
        return { title, category };
      }
    };
  }

  return {
    createStudioEditorPresentationLabelStateController,
    normalizeLabel
  };
});
