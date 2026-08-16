(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPointerAttachment = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioPointerAttachmentManager() {
    const registry = new WeakMap();

    function detach(doc) {
      const registration = doc && registry.get(doc);
      if (!registration) return false;

      registration.listeners.forEach(({ target, eventName, handler, capture }) => {
        if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener(eventName, handler, capture);
        }
      });
      registry.delete(doc);
      return true;
    }

    function attach(doc, handlers, options = {}) {
      const body = doc && doc.body;
      if (!body || typeof body.addEventListener !== 'function' || !handlers) return false;

      detach(doc);

      const listeners = [];
      const addListener = (target, eventName, handler, capture) => {
        if (!target || typeof target.addEventListener !== 'function'
          || typeof handler !== 'function') return;
        target.addEventListener(eventName, handler, capture);
        listeners.push({ target, eventName, handler, capture });
      };

      if (options.preventNativeDrag && typeof doc.addEventListener === 'function') {
        const preventNativeDrag = (event) => {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
        };
        addListener(doc, 'dragstart', preventNativeDrag, true);
      }

      [
        ['pointerdown', handlers.handlePointerDown],
        ['pointermove', handlers.handlePointerMove],
        ['pointerup', handlers.handlePointerUp],
        ['pointercancel', handlers.handlePointerCancel],
        ['lostpointercapture', handlers.handlePointerCancel]
      ].forEach(([eventName, handler]) => addListener(body, eventName, handler, true));

      const frameWindow = doc.defaultView;
      if (frameWindow
        && typeof frameWindow.addEventListener === 'function'
        && typeof handlers.handleWindowBlur === 'function') {
        addListener(frameWindow, 'blur', handlers.handleWindowBlur, true);
      }
      registry.set(doc, { listeners });
      return true;
    }

    return { attach, detach };
  }

  return { createStudioPointerAttachmentManager };
});
