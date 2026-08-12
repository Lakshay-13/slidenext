(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationDashboardAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createPresentationDashboardAccessors(options = {}) {
    const dashboardController = options.dashboardController || null;
    const creationController = options.creationController || null;

    function call(controller, methodName, fallback, ...args) {
      return controller && typeof controller[methodName] === 'function'
        ? controller[methodName](...args)
        : fallback;
    }

    return {
      dashboardController,
      creationController,
      setLoadingState: () => call(dashboardController, 'setLoadingState', false),
      load: () => call(dashboardController, 'load', []),
      filter: (category) => call(dashboardController, 'filter', '', category),
      openCreate: () => call(creationController, 'open', false),
      closeCreate: () => call(creationController, 'close', false),
      submitCreate: (event) => call(creationController, 'submit', null, event)
    };
  }

  return { createPresentationDashboardAccessors };
});
