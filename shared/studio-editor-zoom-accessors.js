(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorZoomAccessors(options = {}) {
    const zoomController = options.zoomController || null;

    function call(methodName, fallback, ...args) {
      return zoomController && typeof zoomController[methodName] === 'function'
        ? zoomController[methodName](...args)
        : fallback;
    }

    function applyZoom(scaleValue) {
      return call('apply', undefined, scaleValue);
    }

    return {
      syncCanvasRulers: () => call('syncRulers', false),
      applyZoom,
      zoomIn: () => call('zoomIn', false, applyZoom),
      zoomOut: () => call('zoomOut', false, applyZoom),
      zoomSelectChange: (value) => call('zoomSelectChange', false, value, applyZoom),
      bindStudioEditorZoomControls: (options = {}) => {
        const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
        if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

        const bindings = {};
        const controls = [
          ['zoomOutBtn', (event) => {
            if (event && event.preventDefault) event.preventDefault();
            return call('zoomOut', false, applyZoom);
          }],
          ['zoomSelect', (event) => {
            const target = event && event.currentTarget ? event.currentTarget : event;
            return call(
              'zoomSelectChange',
              false,
              target && typeof target.value !== 'undefined' ? target.value : '',
              applyZoom
            );
          }],
          ['zoomInBtn', (event) => {
            if (event && event.preventDefault) event.preventDefault();
            return call('zoomIn', false, applyZoom);
          }]
        ];
        controls.forEach(([id, handler]) => {
          const control = documentRef.getElementById(id);
          if (!control || typeof control.addEventListener !== 'function') {
            bindings[id] = false;
            return;
          }
          control.addEventListener(id === 'zoomSelect' ? 'change' : 'click', handler);
          bindings[id] = true;
        });
        return bindings;
      }
    };
  }

  function createStudioEditorZoomGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorZoomAccessors(options);

    return {
      syncCanvasRulers: () => accessors.syncCanvasRulers(),
      applyZoom: (scaleValue) => {
        accessors.applyZoom(scaleValue);
      },
      zoomIn: () => accessors.zoomIn(),
      zoomOut: () => accessors.zoomOut(),
      zoomSelectChange: (value) => accessors.zoomSelectChange(value)
    };
  }

  return {
    createStudioEditorZoomAccessors,
    createStudioEditorZoomGlobalApi
  };
});
