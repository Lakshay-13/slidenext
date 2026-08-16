(function (root, factory) {
  const transformApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-transform')
    : root && root.SlideNextStudioEditorTransform;
  const api = factory(transformApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutConversion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (transformApi) {
  function getStudioConversionSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;

    return selection.filter((element) => {
      try {
        return isEligibleElement(element) && !isHidden(element);
      } catch (error) {
        return false;
      }
    });
  }

  function normalizePixel(value) {
    if (Number.isFinite(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function readComputedStyle(element) {
    const documentRef = element && element.ownerDocument;
    const view = documentRef && documentRef.defaultView;
    if (!view || typeof view.getComputedStyle !== 'function') return null;
    try {
      return view.getComputedStyle(element);
    } catch (error) {
      return null;
    }
  }

  function readBoxDimension(computedStyle, axis, fallback) {
    if (!computedStyle || computedStyle.boxSizing === 'border-box') return fallback;
    const start = axis === 'width' ? 'Left' : 'Top';
    const end = axis === 'width' ? 'Right' : 'Bottom';
    const padding = (normalizePixel(computedStyle[`padding${start}`]) || 0)
      + (normalizePixel(computedStyle[`padding${end}`]) || 0);
    const border = (normalizePixel(computedStyle[`border${start}Width`]) || 0)
      + (normalizePixel(computedStyle[`border${end}Width`]) || 0);
    return Math.max(0, fallback - padding - border);
  }

  function buildStudioFlowToFreeformStylePatch(item) {
    if (!item || !item.element) return null;
    const element = item.element;
    const width = normalizePixel(item.width);
    const height = normalizePixel(item.height);
    const left = normalizePixel(item.absLeft);
    const top = normalizePixel(item.absTop);
    const parentLeft = normalizePixel(item.parentLeft);
    const parentTop = normalizePixel(item.parentTop);
    if ([width, height, left, top, parentLeft, parentTop].some((value) => value === null)) {
      return null;
    }

    const computedStyle = readComputedStyle(element);
    const beforeStyle = ['position', 'margin', 'left', 'top', 'width', 'height'].reduce(
      (style, property) => {
        style[property] = element.style && typeof element.style[property] === 'string'
          ? element.style[property]
          : '';
        return style;
      },
      {}
    );
    const afterStyle = {
      position: 'absolute',
      margin: '0px',
      left: `${left - parentLeft}px`,
      top: `${top - parentTop}px`,
      width: `${readBoxDimension(computedStyle, 'width', width)}px`,
      height: `${readBoxDimension(computedStyle, 'height', height)}px`
    };

    return {
      element,
      beforeStyle,
      afterStyle,
      layout: {
        mode: 'absolute',
        x: left,
        y: top,
        width,
        height
      }
    };
  }

  function buildStudioFlowToFreeformPlan(elements = [], options = {}) {
    const selection = getStudioConversionSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;

    if (selection.length === 0) {
      return { selection, items: [], canConvert: false, reason: 'empty-selection' };
    }
    let hasLockedSelection = false;
    try {
      hasLockedSelection = selection.some((element) => isLocked(element));
    } catch (error) {
      return { selection, items: [], canConvert: false, reason: 'locked-selection' };
    }
    if (hasLockedSelection) {
      return { selection, items: [], canConvert: false, reason: 'locked-selection' };
    }
    let hasFreeformSelection = false;
    try {
      hasFreeformSelection = selection.some((element) => isFreeformPositioned(element));
    } catch (error) {
      return { selection, items: [], canConvert: false, reason: 'geometry-unavailable' };
    }
    if (hasFreeformSelection) {
      return { selection, items: [], canConvert: false, reason: 'already-freeform' };
    }

    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : transformApi && typeof transformApi.buildStudioPositionedLayoutItems === 'function'
        ? transformApi.buildStudioPositionedLayoutItems
        : null;
    if (!buildPositionedLayoutItems) {
      return { selection, items: [], canConvert: false, reason: 'geometry-unavailable' };
    }

    let positionedItems = [];
    try {
      positionedItems = buildPositionedLayoutItems(selection, options);
    } catch (error) {
      positionedItems = [];
    }
    if (!Array.isArray(positionedItems) || positionedItems.length !== selection.length) {
      return { selection, items: [], canConvert: false, reason: 'geometry-unavailable' };
    }

    const items = positionedItems.map(buildStudioFlowToFreeformStylePatch);
    if (items.some((item) => !item)) {
      return { selection, items: [], canConvert: false, reason: 'geometry-unavailable' };
    }

    return {
      selection,
      items,
      canConvert: true,
      reason: ''
    };
  }

  return {
    getStudioConversionSelection,
    buildStudioFlowToFreeformStylePatch,
    buildStudioFlowToFreeformPlan
  };
});
