(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDIO_RESIZE_WIDTH_TAGS = new Set(['img', 'table', 'pre', 'code', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const STUDIO_RESIZE_HEIGHT_TAGS = new Set(['img', 'table', 'pre', 'code', 'div']);

  function getStudioTransformSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioTransformSelectionState(elements = [], options = {}) {
    const selection = getStudioTransformSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;

    return {
      selection,
      canTransform: selection.length > 0 && selection.every((element) => {
        return !isLocked(element) && isFreeformPositioned(element);
      })
    };
  }

  function buildStudioTransformPointerSelectionPlan(selectionState = {}, options = {}) {
    const selection = Array.isArray(selectionState.selection) ? selectionState.selection : [];
    const dragTarget = options.dragTarget || null;
    const hasHandle = !!options.handle;
    const hasOverlay = !!options.overlay;
    const didAttemptSelection = !!options.didAttemptSelection;
    const targetIsSelected = !!dragTarget && selection.includes(dragTarget);

    return {
      hasTransformTarget: hasHandle || hasOverlay || !!dragTarget,
      shouldSelectTarget: !!dragTarget && !targetIsSelected,
      selectOptions: {
        additive: !!options.shiftKey,
        toggle: !!options.shiftKey
      },
      shouldFallbackSelectTarget: !hasHandle && !hasOverlay && !!dragTarget && selection.length === 0 && didAttemptSelection
    };
  }

  function resolveStudioTransformPointerSelectionState(options = {}) {
    const getSelectionState = typeof options.getSelectionState === 'function'
      ? options.getSelectionState
      : () => ({ selection: [], canTransform: false });
    const selectElement = typeof options.selectElement === 'function'
      ? options.selectElement
      : () => {};
    const planOptions = {
      handle: options.handle,
      overlay: options.overlay,
      dragTarget: options.dragTarget,
      shiftKey: !!options.shiftKey
    };

    let selectionState = getSelectionState();
    let pointerSelectionPlan = buildStudioTransformPointerSelectionPlan(selectionState, planOptions);
    let didSelectTarget = false;
    let didFallbackSelectTarget = false;

    if (!pointerSelectionPlan.hasTransformTarget) {
      return {
        selectionState,
        pointerSelectionPlan,
        didSelectTarget,
        didFallbackSelectTarget
      };
    }

    if (pointerSelectionPlan.shouldSelectTarget) {
      selectElement(options.dragTarget, pointerSelectionPlan.selectOptions);
      didSelectTarget = true;
      selectionState = getSelectionState();
      pointerSelectionPlan = buildStudioTransformPointerSelectionPlan(selectionState, {
        ...planOptions,
        didAttemptSelection: true
      });
    }

    if (pointerSelectionPlan.shouldFallbackSelectTarget) {
      selectElement(options.dragTarget);
      didFallbackSelectTarget = true;
      selectionState = getSelectionState();
      pointerSelectionPlan = buildStudioTransformPointerSelectionPlan(selectionState, {
        ...planOptions,
        didAttemptSelection: true
      });
    }

    return {
      selectionState,
      pointerSelectionPlan,
      didSelectTarget,
      didFallbackSelectTarget
    };
  }

  function shouldHandleStudioTransformPointerEvent(session = {}, event = {}) {
    if (!session) {
      return false;
    }
    return event && event.pointerId === session.pointerId;
  }

  function canStudioTransformSelection(elements = [], options = {}) {
    return buildStudioTransformSelectionState(elements, options).canTransform;
  }

  function isStudioFreeformPositioned(element, options = {}) {
    if (!element) return false;
    const view = options.view || (element.ownerDocument && element.ownerDocument.defaultView) || null;
    if (!view || typeof view.getComputedStyle !== 'function') {
      return false;
    }
    const computed = view.getComputedStyle(element);
    return !!computed && (computed.position === 'absolute' || computed.position === 'fixed');
  }

  function buildStudioTransformSizingLockState(element, options = {}) {
    const inlineWidth = typeof options.inlineWidth === 'string'
      ? options.inlineWidth
      : element && element.style && typeof element.style.width === 'string'
        ? element.style.width
        : '';
    const inlineHeight = typeof options.inlineHeight === 'string'
      ? options.inlineHeight
      : element && element.style && typeof element.style.height === 'string'
        ? element.style.height
        : '';
    const isPrePositioned = typeof options.isPrePositioned === 'boolean'
      ? options.isPrePositioned
      : isStudioFreeformPositioned(element, options);
    const tagName = element && typeof element.tagName === 'string'
      ? element.tagName.toLowerCase()
      : '';
    const normalizedInlineWidth = inlineWidth.trim();
    const normalizedInlineHeight = inlineHeight.trim();

    return {
      isPrePositioned,
      lockWidth: !isPrePositioned && normalizedInlineWidth === '',
      lockHeight: !isPrePositioned && normalizedInlineHeight === '' && ['table', 'pre', 'code'].includes(tagName)
    };
  }

  function shouldStudioResizeWidth(element) {
    const tagName = element && typeof element.tagName === 'string'
      ? element.tagName.toLowerCase()
      : '';
    return STUDIO_RESIZE_WIDTH_TAGS.has(tagName);
  }

  function shouldStudioResizeHeight(element) {
    const tagName = element && typeof element.tagName === 'string'
      ? element.tagName.toLowerCase()
      : '';
    return STUDIO_RESIZE_HEIGHT_TAGS.has(tagName);
  }

  function clampStudioTransformValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeStudioTransformBounds(bounds = {}, slideRect = {}, options = {}) {
    let left = Number.isFinite(bounds.left) ? bounds.left : 0;
    let top = Number.isFinite(bounds.top) ? bounds.top : 0;
    let right = Number.isFinite(bounds.right) ? bounds.right : left;
    let bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top;
    const slideWidth = Number.isFinite(slideRect.width) ? slideRect.width : 0;
    const slideHeight = Number.isFinite(slideRect.height) ? slideRect.height : 0;
    const mode = options.mode || '';
    const handleDir = options.handleDir || '';
    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 0;
    const dragOverflowMarginPx = Number.isFinite(options.dragOverflowMarginPx) ? options.dragOverflowMarginPx : 0;

    if (mode === 'drag') {
      const width = right - left;
      const height = bottom - top;
      const minLeft = -dragOverflowMarginPx;
      const maxLeft = Math.max(minLeft, slideWidth - width + dragOverflowMarginPx);
      const minTop = -dragOverflowMarginPx;
      const maxTop = Math.max(minTop, slideHeight - height + dragOverflowMarginPx);
      left = clampStudioTransformValue(left, minLeft, maxLeft);
      top = clampStudioTransformValue(top, minTop, maxTop);
      right = left + width;
      bottom = top + height;
    } else {
      left = clampStudioTransformValue(left, 0, slideWidth);
      right = clampStudioTransformValue(right, 0, slideWidth);
      top = clampStudioTransformValue(top, 0, slideHeight);
      bottom = clampStudioTransformValue(bottom, 0, slideHeight);

      if (right - left < minSizePx) {
        if (handleDir.includes('w')) left = right - minSizePx;
        else right = left + minSizePx;
      }
      if (bottom - top < minSizePx) {
        if (handleDir.includes('n')) top = bottom - minSizePx;
        else bottom = top + minSizePx;
      }

      left = clampStudioTransformValue(left, 0, slideWidth);
      right = clampStudioTransformValue(right, 0, slideWidth);
      top = clampStudioTransformValue(top, 0, slideHeight);
      bottom = clampStudioTransformValue(bottom, 0, slideHeight);
    }

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  function buildStudioTransformInteractionBounds(session = {}, options = {}) {
    const startBounds = session.startBounds || {};
    const startLeft = Number.isFinite(startBounds.left) ? startBounds.left : 0;
    const startTop = Number.isFinite(startBounds.top) ? startBounds.top : 0;
    const startRight = Number.isFinite(startBounds.right) ? startBounds.right : startLeft;
    const startBottom = Number.isFinite(startBounds.bottom) ? startBounds.bottom : startTop;
    const startWidth = Number.isFinite(startBounds.width) ? startBounds.width : startRight - startLeft;
    const startHeight = Number.isFinite(startBounds.height) ? startBounds.height : startBottom - startTop;
    const pointer = options.pointer || {};
    const dx = Number.isFinite(options.dx) ? options.dx : 0;
    const dy = Number.isFinite(options.dy) ? options.dy : 0;

    let left = startLeft;
    let top = startTop;
    let right = startRight;
    let bottom = startBottom;

    if (session.type === 'drag') {
      const grabOffset = session.grabOffset || {};
      left = (Number.isFinite(pointer.x) ? pointer.x : startLeft) - (Number.isFinite(grabOffset.x) ? grabOffset.x : 0);
      top = (Number.isFinite(pointer.y) ? pointer.y : startTop) - (Number.isFinite(grabOffset.y) ? grabOffset.y : 0);
      right = left + startWidth;
      bottom = top + startHeight;
    } else {
      const handleDir = typeof session.handleDir === 'string' ? session.handleDir : '';
      if (handleDir.includes('w')) left += dx;
      if (handleDir.includes('e')) right += dx;
      if (handleDir.includes('n')) top += dy;
      if (handleDir.includes('s')) bottom += dy;
    }

    return { left, top, right, bottom };
  }

  function resolveStudioTransformBounds(session = {}, options = {}) {
    const slideBounds = options.slideBounds || session.slideBounds || {};
    const handleDir = typeof session.handleDir === 'string' ? session.handleDir : '';
    const normalizeOptions = {
      mode: session.type,
      handleDir,
      minSizePx: Number.isFinite(options.minSizePx) ? options.minSizePx : 0,
      dragOverflowMarginPx: Number.isFinite(options.dragOverflowMarginPx) ? options.dragOverflowMarginPx : 0
    };
    const rawBounds = buildStudioTransformInteractionBounds(session, options);
    const normalizedBounds = normalizeStudioTransformBounds(rawBounds, slideBounds, normalizeOptions);
    return normalizeStudioTransformBounds(normalizedBounds, slideBounds, normalizeOptions);
  }

  function applyStudioTransformBounds(session = {}, bounds = {}, options = {}) {
    const items = Array.isArray(session.items) ? session.items : [];
    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 0;
    const shouldResizeWidth = typeof options.shouldResizeWidth === 'function'
      ? options.shouldResizeWidth
      : shouldStudioResizeWidth;
    const shouldResizeHeight = typeof options.shouldResizeHeight === 'function'
      ? options.shouldResizeHeight
      : shouldStudioResizeHeight;

    if (session.type === 'drag') {
      const startBounds = session.startBounds || {};
      const dx = (Number.isFinite(bounds.left) ? bounds.left : 0) - (Number.isFinite(startBounds.left) ? startBounds.left : 0);
      const dy = (Number.isFinite(bounds.top) ? bounds.top : 0) - (Number.isFinite(startBounds.top) ? startBounds.top : 0);

      items.forEach((item) => {
        const nextAbsLeft = (Number.isFinite(item.startAbsLeft) ? item.startAbsLeft : 0) + dx;
        const nextAbsTop = (Number.isFinite(item.startAbsTop) ? item.startAbsTop : 0) + dy;
        item.element.style.left = `${nextAbsLeft - (Number.isFinite(item.parentOffsetLeft) ? item.parentOffsetLeft : 0)}px`;
        item.element.style.top = `${nextAbsTop - (Number.isFinite(item.parentOffsetTop) ? item.parentOffsetTop : 0)}px`;
      });
      return;
    }

    const startBounds = session.startBounds || {};
    const startWidth = Number.isFinite(startBounds.width) ? startBounds.width : 0;
    const startHeight = Number.isFinite(startBounds.height) ? startBounds.height : 0;
    const scaleX = startWidth === 0 ? 1 : (Number.isFinite(bounds.width) ? bounds.width : 0) / startWidth;
    const scaleY = startHeight === 0 ? 1 : (Number.isFinite(bounds.height) ? bounds.height : 0) / startHeight;

    items.forEach((item) => {
      const relLeft = (Number.isFinite(item.startAbsLeft) ? item.startAbsLeft : 0) - (Number.isFinite(startBounds.left) ? startBounds.left : 0);
      const relTop = (Number.isFinite(item.startAbsTop) ? item.startAbsTop : 0) - (Number.isFinite(startBounds.top) ? startBounds.top : 0);
      const nextAbsLeft = (Number.isFinite(bounds.left) ? bounds.left : 0) + (relLeft * scaleX);
      const nextAbsTop = (Number.isFinite(bounds.top) ? bounds.top : 0) + (relTop * scaleY);

      item.element.style.left = `${nextAbsLeft - (Number.isFinite(item.parentOffsetLeft) ? item.parentOffsetLeft : 0)}px`;
      item.element.style.top = `${nextAbsTop - (Number.isFinite(item.parentOffsetTop) ? item.parentOffsetTop : 0)}px`;

      if (shouldResizeWidth(item.element)) {
        item.element.style.width = `${Math.max(minSizePx, (Number.isFinite(item.startWidth) ? item.startWidth : 0) * scaleX)}px`;
      }
      if (shouldResizeHeight(item.element)) {
        item.element.style.height = `${Math.max(minSizePx, (Number.isFinite(item.startHeight) ? item.startHeight : 0) * scaleY)}px`;
      }
    });
  }

  function materializeStudioTransformSession(session = {}, options = {}) {
    if (!session || session.materialized) {
      return {
        didMaterialize: false,
        session
      };
    }

    const draggingClassName = options.draggingClassName || 'editor-dragging';
    const overlayDraggingClassName = options.overlayDraggingClassName || 'drag-preview';
    const items = Array.isArray(session.items) ? session.items : [];

    items.forEach((item) => {
      if (!item || !item.element || !item.element.style) {
        return;
      }

      item.element.style.position = 'absolute';
      item.element.style.margin = '0';
      if (item.lockWidth) {
        item.element.style.width = `${item.startWidth}px`;
      }
      if (item.lockHeight) {
        item.element.style.height = `${item.startHeight}px`;
      }
      item.element.style.left = `${item.startAbsLeft - item.parentOffsetLeft}px`;
      item.element.style.top = `${item.startAbsTop - item.parentOffsetTop}px`;
      if (item.element.classList && typeof item.element.classList.add === 'function') {
        item.element.classList.add(draggingClassName);
      }
    });

    if (session.overlay && session.overlay.classList && typeof session.overlay.classList.add === 'function') {
      session.overlay.classList.add(overlayDraggingClassName);
    }

    session.materialized = true;
    return {
      didMaterialize: true,
      session
    };
  }

  function captureStudioTransformSessionPointer(session = {}) {
    if (!session) {
      return {
        didCapture: false,
        session
      };
    }

    if (session.captureTarget && typeof session.captureTarget.setPointerCapture === 'function') {
      try {
        session.captureTarget.setPointerCapture(session.pointerId);
        return {
          didCapture: true,
          session
        };
      } catch (_) {
        // no-op
      }
    }

    return {
      didCapture: false,
      session
    };
  }

  function progressStudioTransformSession(session = {}, options = {}) {
    if (!session) {
      return {
        didMaterialize: false,
        isActive: false,
        didMove: false,
        session
      };
    }

    const moveDistanceScreen = Number.isFinite(options.moveDistanceScreen) ? options.moveDistanceScreen : 0;
    const dragStartThresholdPx = Number.isFinite(options.dragStartThresholdPx) ? options.dragStartThresholdPx : 0;
    let didMaterialize = false;

    if (!session.materialized && moveDistanceScreen >= dragStartThresholdPx) {
      didMaterialize = materializeStudioTransformSession(session, options).didMaterialize;
    }

    if (!session.materialized) {
      return {
        didMaterialize,
        isActive: false,
        didMove: false,
        session
      };
    }

    if (moveDistanceScreen >= dragStartThresholdPx) {
      session.moved = true;
    }

    return {
      didMaterialize,
      isActive: true,
      didMove: !!session.moved,
      session
    };
  }

  function cleanupStudioTransformSession(session = {}, options = {}) {
    if (!session) {
      return {
        didCleanup: false,
        didReleasePointerCapture: false,
        session
      };
    }

    const draggingClassName = options.draggingClassName || 'editor-dragging';
    const overlayDraggingClassName = options.overlayDraggingClassName || 'drag-preview';
    let didReleasePointerCapture = false;

    if (session.captureTarget && typeof session.captureTarget.releasePointerCapture === 'function') {
      try {
        if (session.captureTarget.hasPointerCapture?.(session.pointerId)) {
          session.captureTarget.releasePointerCapture(session.pointerId);
          didReleasePointerCapture = true;
        }
      } catch (_) {
        // no-op
      }
    }

    const items = Array.isArray(session.items) ? session.items : [];
    items.forEach((item) => {
      if (item && item.element && item.element.classList && typeof item.element.classList.remove === 'function') {
        item.element.classList.remove(draggingClassName);
      }
    });

    if (session.overlay && session.overlay.classList && typeof session.overlay.classList.remove === 'function') {
      session.overlay.classList.remove(overlayDraggingClassName);
    }

    session.materialized = false;
    return {
      didCleanup: true,
      didReleasePointerCapture,
      session
    };
  }

  function finalizeStudioTransformSession(session = {}, options = {}) {
    if (!session) {
      return {
        didFinalize: false,
        didMove: false,
        didReleasePointerCapture: false,
        session
      };
    }

    const didMove = !!session.moved;
    const cleanupResult = cleanupStudioTransformSession(session, options);
    return {
      didFinalize: true,
      didMove,
      didReleasePointerCapture: cleanupResult.didReleasePointerCapture,
      session
    };
  }

  function buildStudioTransformSessionItem(element, options = {}) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return null;
    }

    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const parent = getClosestPositionedAncestor(element);
    if (!parent || typeof parent.getBoundingClientRect !== 'function') {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const rectOnSlide = getRectOnSlide(rect, options.slideMetrics);
    const parentOnSlide = getRectOnSlide(parentRect, options.slideMetrics);
    const sizingLockState = buildStudioTransformSizingLockState(element, options);

    return {
      element,
      startAbsLeft: rectOnSlide.left,
      startAbsTop: rectOnSlide.top,
      startWidth: rectOnSlide.right - rectOnSlide.left,
      startHeight: rectOnSlide.bottom - rectOnSlide.top,
      parentOffsetLeft: parentOnSlide.left,
      parentOffsetTop: parentOnSlide.top,
      lockWidth: sizingLockState.lockWidth,
      lockHeight: sizingLockState.lockHeight
    };
  }

  function buildStudioTransformSession(options = {}) {
    const startPointer = options.startPointer || {};
    const startBounds = options.startBounds || {};
    const normalizedStartPointer = {
      x: Number.isFinite(startPointer.x) ? startPointer.x : 0,
      y: Number.isFinite(startPointer.y) ? startPointer.y : 0
    };
    const startLeft = Number.isFinite(startBounds.left) ? startBounds.left : 0;
    const startTop = Number.isFinite(startBounds.top) ? startBounds.top : 0;

    return {
      type: options.type === 'resize' ? 'resize' : 'drag',
      handleDir: typeof options.handleDir === 'string' ? options.handleDir : '',
      pointerId: options.pointerId,
      captureTarget: options.captureTarget || null,
      startClientX: Number.isFinite(options.startClientX) ? options.startClientX : 0,
      startClientY: Number.isFinite(options.startClientY) ? options.startClientY : 0,
      startPointer: normalizedStartPointer,
      grabOffset: {
        x: normalizedStartPointer.x - startLeft,
        y: normalizedStartPointer.y - startTop
      },
      slideMetrics: options.slideMetrics || null,
      slideBounds: options.slideBounds || {},
      startBounds,
      items: Array.isArray(options.items) ? options.items : [],
      moved: false,
      materialized: false,
      overlay: options.overlay || null
    };
  }

  function buildStudioTransformMotionState(session = {}, options = {}) {
    const pointer = options.pointer || {};
    const startPointer = session.startPointer || {};
    const startClientX = Number.isFinite(session.startClientX) ? session.startClientX : 0;
    const startClientY = Number.isFinite(session.startClientY) ? session.startClientY : 0;
    const clientX = Number.isFinite(options.clientX) ? options.clientX : startClientX;
    const clientY = Number.isFinite(options.clientY) ? options.clientY : startClientY;

    return {
      dx: (Number.isFinite(pointer.x) ? pointer.x : 0) - (Number.isFinite(startPointer.x) ? startPointer.x : 0),
      dy: (Number.isFinite(pointer.y) ? pointer.y : 0) - (Number.isFinite(startPointer.y) ? startPointer.y : 0),
      moveDistanceScreen: Math.hypot(clientX - startClientX, clientY - startClientY)
    };
  }

  function buildStudioTransformStartState(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getPointerOnSlide = typeof options.getPointerOnSlide === 'function'
      ? options.getPointerOnSlide
      : () => ({ x: 0, y: 0 });
    const getSelectionBounds = typeof options.getSelectionBounds === 'function'
      ? options.getSelectionBounds
      : () => null;
    const buildSessionItem = typeof options.buildSessionItem === 'function'
      ? options.buildSessionItem
      : buildStudioTransformSessionItem;

    const slideMetrics = getSlideMetrics(options.slide);
    const slideBounds = {
      width: Number.isFinite(slideMetrics && slideMetrics.logicalWidth) ? slideMetrics.logicalWidth : 0,
      height: Number.isFinite(slideMetrics && slideMetrics.logicalHeight) ? slideMetrics.logicalHeight : 0
    };
    const startPointer = getPointerOnSlide(options.event, slideMetrics);
    const startBounds = getSelectionBounds(selection, slideMetrics);
    if (!startBounds) {
      return null;
    }

    return {
      slideMetrics,
      slideBounds,
      startPointer,
      startBounds,
      items: selection.map((element) => buildSessionItem(element, {
        ...options.itemOptions,
        slideMetrics
      }))
    };
  }

  return {
    getStudioTransformSelection,
    buildStudioTransformSelectionState,
    buildStudioTransformPointerSelectionPlan,
    resolveStudioTransformPointerSelectionState,
    shouldHandleStudioTransformPointerEvent,
    canStudioTransformSelection,
    isStudioFreeformPositioned,
    buildStudioTransformSizingLockState,
    STUDIO_RESIZE_WIDTH_TAGS,
    STUDIO_RESIZE_HEIGHT_TAGS,
    shouldStudioResizeWidth,
    shouldStudioResizeHeight,
    buildStudioTransformInteractionBounds,
    resolveStudioTransformBounds,
    normalizeStudioTransformBounds,
    applyStudioTransformBounds,
    materializeStudioTransformSession,
    captureStudioTransformSessionPointer,
    progressStudioTransformSession,
    cleanupStudioTransformSession,
    finalizeStudioTransformSession,
    buildStudioTransformSessionItem,
    buildStudioTransformSession,
    buildStudioTransformMotionState,
    buildStudioTransformStartState
  };
});
