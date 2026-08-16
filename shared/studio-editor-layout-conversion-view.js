(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutConversionView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REASON_MESSAGES = {
    'empty-selection': 'Select a structured element to convert.',
    'locked-selection': 'Unlock the selection before converting it.',
    'already-freeform': 'The selection already uses the freeform canvas.',
    'geometry-unavailable': 'Rendered geometry is unavailable for this selection.',
    'slide-unavailable': 'Open a slide before converting its layout.'
  };

  function getStudioLayoutConversionMessage(reason, canConvert) {
    if (canConvert) return 'Convert the current rendered layout to a freeform canvas.';
    return REASON_MESSAGES[reason] || 'This selection cannot be converted yet.';
  }

  function syncStudioLayoutConversionControl(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const button = documentRef.getElementById('convertFlowToFreeformBtn');
    const status = documentRef.getElementById('layoutConversionStatus');
    if (!button && !status) return false;

    const plan = options.plan || {};
    const canConvert = plan.canConvert === true;
    const message = getStudioLayoutConversionMessage(plan.reason, canConvert);
    if (button) {
      button.disabled = !canConvert;
      button.title = message;
      if (button.dataset) button.dataset.canConvert = canConvert ? 'true' : 'false';
    }
    if (status) status.textContent = message;
    return true;
  }

  function bindStudioEditorLayoutConversionControl(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const convertSelectedElementsToFreeform = typeof options.convertSelectedElementsToFreeform === 'function'
      ? options.convertSelectedElementsToFreeform
      : null;
    const button = documentRef.getElementById('convertFlowToFreeformBtn');
    if (!button || typeof button.addEventListener !== 'function') {
      return { convertFlowToFreeformBtn: false };
    }
    button.addEventListener('click', () => {
      if (convertSelectedElementsToFreeform) convertSelectedElementsToFreeform();
    });
    return { convertFlowToFreeformBtn: true };
  }

  return {
    getStudioLayoutConversionMessage,
    syncStudioLayoutConversionControl,
    bindStudioEditorLayoutConversionControl
  };
});
