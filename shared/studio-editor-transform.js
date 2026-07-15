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
  const DEFAULT_DRAG_START_THRESHOLD_PX = 4;
  const STUDIO_TRANSFORM_MOVED_VERSION_LABEL = 'Auto: Moved Element';

  function normalizeStudioTransformDragStartThreshold(value) {
    return Number.isFinite(value)
      ? Math.max(0, value)
      : DEFAULT_DRAG_START_THRESHOLD_PX;
  }

  function getStudioSlideMetrics(slide) {
    if (!slide || typeof slide.getBoundingClientRect !== 'function') {
      return {
        rect: { left: 0, top: 0, width: 0, height: 0 },
        logicalWidth: 1920,
        logicalHeight: 1080,
        scaleX: 1,
        scaleY: 1
      };
    }

    const rect = slide.getBoundingClientRect();
    const logicalWidth = slide.clientWidth || rect.width || 1920;
    const logicalHeight = slide.clientHeight || rect.height || 1080;
    const scaleX = rect.width > 0 ? logicalWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? logicalHeight / rect.height : 1;
    return { rect, logicalWidth, logicalHeight, scaleX, scaleY };
  }

  function getStudioRectOnSlide(rect = {}, slideMetrics = {}) {
    const slideRect = slideMetrics.rect || {};
    const scaleX = Number.isFinite(slideMetrics.scaleX) ? slideMetrics.scaleX : 1;
    const scaleY = Number.isFinite(slideMetrics.scaleY) ? slideMetrics.scaleY : 1;

    return {
      left: ((Number.isFinite(rect.left) ? rect.left : 0) - (Number.isFinite(slideRect.left) ? slideRect.left : 0)) * scaleX,
      top: ((Number.isFinite(rect.top) ? rect.top : 0) - (Number.isFinite(slideRect.top) ? slideRect.top : 0)) * scaleY,
      right: ((Number.isFinite(rect.right) ? rect.right : 0) - (Number.isFinite(slideRect.left) ? slideRect.left : 0)) * scaleX,
      bottom: ((Number.isFinite(rect.bottom) ? rect.bottom : 0) - (Number.isFinite(slideRect.top) ? slideRect.top : 0)) * scaleY
    };
  }

  function getStudioPointerOnSlide(event = {}, slideMetrics = {}) {
    const slideRect = slideMetrics.rect || {};
    const scaleX = Number.isFinite(slideMetrics.scaleX) ? slideMetrics.scaleX : 1;
    const scaleY = Number.isFinite(slideMetrics.scaleY) ? slideMetrics.scaleY : 1;

    return {
      x: ((Number.isFinite(event.clientX) ? event.clientX : 0) - (Number.isFinite(slideRect.left) ? slideRect.left : 0)) * scaleX,
      y: ((Number.isFinite(event.clientY) ? event.clientY : 0) - (Number.isFinite(slideRect.top) ? slideRect.top : 0)) * scaleY
    };
  }

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

  function buildStudioTransformPointerStartIntent(event = {}, options = {}) {
    const target = event && event.target ? event.target : null;
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const handleSelector = options.handleSelector || '.editor-resize-handle';
    const overlaySelector = options.overlaySelector || '#editorSelectionOverlay';
    const handle = target && typeof target.closest === 'function'
      ? target.closest(handleSelector)
      : null;
    const overlay = target && typeof target.closest === 'function'
      ? target.closest(overlaySelector)
      : null;
    const dragTarget = resolveEditableTarget(target);

    return {
      canStart: !!event && event.button === 0 && event.isPrimary !== false,
      handle,
      overlay,
      dragTarget
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

  function lockStudioTransformAspectRatio(bounds = {}, session = {}, options = {}) {
    if (session.type !== 'resize' || (!session.lockAspectRatio && !options.lockAspectRatio)) {
      return bounds;
    }

    const startBounds = session.startBounds || {};
    const startWidth = Number.isFinite(startBounds.width)
      ? startBounds.width
      : (Number.isFinite(startBounds.right) ? startBounds.right : 0) - (Number.isFinite(startBounds.left) ? startBounds.left : 0);
    const startHeight = Number.isFinite(startBounds.height)
      ? startBounds.height
      : (Number.isFinite(startBounds.bottom) ? startBounds.bottom : 0) - (Number.isFinite(startBounds.top) ? startBounds.top : 0);
    if (!(startWidth > 0) || !(startHeight > 0)) {
      return bounds;
    }

    const aspectRatio = startWidth / startHeight;
    const handleDir = typeof session.handleDir === 'string' ? session.handleDir : '';
    const hasHorizontalHandle = handleDir.includes('e') || handleDir.includes('w');
    const hasVerticalHandle = handleDir.includes('n') || handleDir.includes('s');
    if (!hasHorizontalHandle && !hasVerticalHandle) {
      return bounds;
    }

    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 0;
    const rawWidth = Math.max(minSizePx, Math.abs((bounds.right || 0) - (bounds.left || 0)));
    const rawHeight = Math.max(minSizePx, Math.abs((bounds.bottom || 0) - (bounds.top || 0)));
    let width = rawWidth;
    let height = rawHeight;

    if (hasHorizontalHandle && hasVerticalHandle) {
      const heightFromWidth = rawWidth / aspectRatio;
      const widthFromHeight = rawHeight * aspectRatio;
      if (Math.abs(heightFromWidth - rawHeight) <= Math.abs(widthFromHeight - rawWidth)) {
        height = heightFromWidth;
      } else {
        width = widthFromHeight;
      }
    } else if (hasHorizontalHandle) {
      height = rawWidth / aspectRatio;
    } else {
      width = rawHeight * aspectRatio;
    }

    width = Math.max(minSizePx, width);
    height = Math.max(minSizePx, width / aspectRatio);
    width = Math.max(minSizePx, height * aspectRatio);

    let left = Number.isFinite(bounds.left) ? bounds.left : 0;
    let top = Number.isFinite(bounds.top) ? bounds.top : 0;
    let right = Number.isFinite(bounds.right) ? bounds.right : left;
    let bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top;

    if (hasHorizontalHandle) {
      if (handleDir.includes('w')) {
        right = Number.isFinite(bounds.right) ? bounds.right : right;
        left = right - width;
      } else {
        left = Number.isFinite(bounds.left) ? bounds.left : left;
        right = left + width;
      }
    } else {
      const centerX = (left + right) / 2;
      left = centerX - (width / 2);
      right = centerX + (width / 2);
    }

    if (hasVerticalHandle) {
      if (handleDir.includes('n')) {
        bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : bottom;
        top = bottom - height;
      } else {
        top = Number.isFinite(bounds.top) ? bounds.top : top;
        bottom = top + height;
      }
    } else {
      const centerY = (top + bottom) / 2;
      top = centerY - (height / 2);
      bottom = centerY + (height / 2);
    }

    return { left, top, right, bottom };
  }

  function snapStudioTransformBounds(bounds = {}, session = {}, options = {}) {
    if (session.type !== 'drag' || options.snapEnabled === false) {
      return {
        bounds,
        guides: []
      };
    }

    const slideBounds = options.slideBounds || session.slideBounds || {};
    const slideWidth = Number.isFinite(slideBounds.width) ? slideBounds.width : 0;
    const slideHeight = Number.isFinite(slideBounds.height) ? slideBounds.height : 0;
    const snapDistancePx = Number.isFinite(options.snapDistancePx) ? options.snapDistancePx : 8;
    const left = Number.isFinite(bounds.left) ? bounds.left : 0;
    const top = Number.isFinite(bounds.top) ? bounds.top : 0;
    const right = Number.isFinite(bounds.right) ? bounds.right : left;
    const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top;
    const width = right - left;
    const height = bottom - top;
    const gridSizePx = Number.isFinite(options.gridSizePx) && options.gridSizePx > 0
      ? options.gridSizePx
      : null;
    const snapTargets = Array.isArray(options.snapTargets)
      ? options.snapTargets
      : Array.isArray(session.snapTargets)
        ? session.snapTargets
        : [];
    const xCandidates = slideWidth > 0
      ? [
          { position: left, target: 0 },
          { position: (left + right) / 2, target: slideWidth / 2 },
          { position: right, target: slideWidth }
        ]
      : [];
    const yCandidates = slideHeight > 0
      ? [
          { position: top, target: 0 },
          { position: (top + bottom) / 2, target: slideHeight / 2 },
          { position: bottom, target: slideHeight }
        ]
      : [];
    if (gridSizePx) {
      xCandidates.push({
        position: left,
        target: Math.round(left / gridSizePx) * gridSizePx,
        kind: 'grid'
      });
      yCandidates.push({
        position: top,
        target: Math.round(top / gridSizePx) * gridSizePx,
        kind: 'grid'
      });
    }
    snapTargets.forEach((target) => {
      if (!target || !Number.isFinite(target.left) || !Number.isFinite(target.right)
        || !Number.isFinite(target.top) || !Number.isFinite(target.bottom)) {
        return;
      }
      const targetCenterX = (target.left + target.right) / 2;
      const targetCenterY = (target.top + target.bottom) / 2;
      [target.left, targetCenterX, target.right].forEach((targetPosition) => {
        xCandidates.push({ position: left, target: targetPosition, kind: 'guide' });
        xCandidates.push({ position: (left + right) / 2, target: targetPosition, kind: 'guide' });
        xCandidates.push({ position: right, target: targetPosition, kind: 'guide' });
      });
      [target.top, targetCenterY, target.bottom].forEach((targetPosition) => {
        yCandidates.push({ position: top, target: targetPosition, kind: 'guide' });
        yCandidates.push({ position: (top + bottom) / 2, target: targetPosition, kind: 'guide' });
        yCandidates.push({ position: bottom, target: targetPosition, kind: 'guide' });
      });
    });
    const findSnap = (candidates) => candidates
      .map((candidate) => ({
        ...candidate,
        distance: Math.abs(candidate.target - candidate.position)
      }))
      .sort((first, second) => first.distance - second.distance)[0];
    const xSnap = findSnap(xCandidates);
    const ySnap = findSnap(yCandidates);
    const nextBounds = { left, top, right, bottom };
    const guides = [];

    if (xSnap && xSnap.distance <= snapDistancePx) {
      const offset = xSnap.target - xSnap.position;
      nextBounds.left += offset;
      nextBounds.right = nextBounds.left + width;
      guides.push({
        axis: 'x',
        position: xSnap.target,
        ...(xSnap.kind ? { kind: xSnap.kind } : {})
      });
    }
    if (ySnap && ySnap.distance <= snapDistancePx) {
      const offset = ySnap.target - ySnap.position;
      nextBounds.top += offset;
      nextBounds.bottom = nextBounds.top + height;
      guides.push({
        axis: 'y',
        position: ySnap.target,
        ...(ySnap.kind ? { kind: ySnap.kind } : {})
      });
    }

    return {
      bounds: nextBounds,
      guides
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

    return lockStudioTransformAspectRatio(
      { left, top, right, bottom },
      session,
      options
    );
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
    const snapResult = snapStudioTransformBounds(rawBounds, session, {
      ...options,
      slideBounds
    });
    if (typeof options.onGuides === 'function') {
      options.onGuides(snapResult.guides);
    }
    const normalizedBounds = normalizeStudioTransformBounds(snapResult.bounds, slideBounds, normalizeOptions);
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
    const dragStartThresholdPx = normalizeStudioTransformDragStartThreshold(options.dragStartThresholdPx);
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

  function restoreStudioTransformSessionStyles(session = {}) {
    if (!session) {
      return {
        didRestore: false,
        restoredCount: 0,
        session
      };
    }

    const properties = ['position', 'margin', 'left', 'top', 'width', 'height'];
    let restoredCount = 0;
    const items = Array.isArray(session.items) ? session.items : [];
    items.forEach((item) => {
      if (!item || !item.element || !item.element.style || !item.startStyle) return;
      properties.forEach((property) => {
        const value = item.startStyle[property];
        item.element.style[property] = typeof value === 'string' ? value : '';
      });
      restoredCount += 1;
    });

    return {
      didRestore: restoredCount > 0,
      restoredCount,
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

  function buildStudioTransformCompletionPlan(finalizeResult = {}, options = {}) {
    const didMove = !!(finalizeResult && finalizeResult.didMove);
    return {
      shouldPersist: didMove,
      versionLabel: didMove
        ? (typeof options.versionLabel === 'string' && options.versionLabel ? options.versionLabel : STUDIO_TRANSFORM_MOVED_VERSION_LABEL)
        : ''
    };
  }

  function finalizeStudioTransformInteractionSession(session, options = {}) {
    const cancelled = options.cancelled === true;
    const finalizeTransformSession = typeof options.finalizeTransformSession === 'function'
      ? options.finalizeTransformSession
      : finalizeStudioTransformSession;
    const buildCompletionPlan = typeof options.buildCompletionPlan === 'function'
      ? options.buildCompletionPlan
      : buildStudioTransformCompletionPlan;

    if (!session) {
      const finalizeResult = finalizeTransformSession(session);
      return {
        finalizeResult,
        completionPlan: buildCompletionPlan(finalizeResult),
        cancelled
      };
    }

    if (cancelled) {
      restoreStudioTransformSessionStyles(session);
      session.moved = false;
    }

    const rawFinalizeResult = finalizeTransformSession(session);
    const finalizeResult = cancelled
      ? {
          ...(rawFinalizeResult && typeof rawFinalizeResult === 'object' ? rawFinalizeResult : {}),
          didMove: false,
          cancelled: true
        }
      : rawFinalizeResult;
    const rawCompletionPlan = buildCompletionPlan(finalizeResult);
    const completionPlan = cancelled
      ? {
          ...(rawCompletionPlan && typeof rawCompletionPlan === 'object' ? rawCompletionPlan : {}),
          shouldPersist: false,
          versionLabel: ''
        }
      : rawCompletionPlan;

    return {
      finalizeResult,
      completionPlan,
      cancelled
    };
  }

  function buildStudioTransformStyleTransaction(finalizeResult = {}, options = {}) {
    const transactionApi = options.transactionApi;
    if (!transactionApi
      || typeof transactionApi.createStudioStyleTransaction !== 'function'
      || !finalizeResult.session
      || !Array.isArray(finalizeResult.session.items)) {
      return null;
    }

    const assignEditorElementId = typeof options.assignEditorElementId === 'function'
      ? options.assignEditorElementId
      : null;
    const properties = ['position', 'margin', 'left', 'top', 'width', 'height'];
    const transactionItems = finalizeResult.session.items.map((item) => {
      const element = item && item.element;
      if (!element) return null;
      if (assignEditorElementId) assignEditorElementId(element);
      const style = element.style || {};
      const after = properties.reduce((nextStyle, property) => {
        nextStyle[property] = typeof style[property] === 'string' ? style[property] : '';
        return nextStyle;
      }, {});
      return {
        element,
        before: item.startStyle || {},
        after
      };
    }).filter(Boolean);

    return transactionApi.createStudioStyleTransaction(transactionItems);
  }

  function buildStudioTransformCanonicalLayoutUpdates(finalizeResult = {}, options = {}) {
    const session = finalizeResult && finalizeResult.session;
    const items = session && Array.isArray(session.items) ? session.items : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const parsePixelValue = (value) => {
      if (Number.isFinite(value)) return value;
      if (typeof value !== 'string' || !value.trim()) return null;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return items.map((item) => {
      const element = item && item.element;
      const style = element && element.style ? element.style : null;
      const nodeId = getElementId(element);
      const left = parsePixelValue(style && style.left);
      const top = parsePixelValue(style && style.top);
      if (!nodeId || left === null || top === null) return null;

      const layout = {
        mode: 'absolute',
        x: left + (Number.isFinite(item.parentOffsetLeft) ? item.parentOffsetLeft : 0),
        y: top + (Number.isFinite(item.parentOffsetTop) ? item.parentOffsetTop : 0)
      };
      const width = parsePixelValue(style && style.width);
      const height = parsePixelValue(style && style.height);
      if (width !== null) layout.width = width;
      if (height !== null) layout.height = height;
      return {
        id: nodeId,
        layout
      };
    }).filter(Boolean);
  }

  function createStudioTransformSessionFinalizer(options = {}) {
    const onSessionEnd = typeof options.onSessionEnd === 'function'
      ? options.onSessionEnd
      : () => {};
    const buildTransaction = typeof options.buildTransaction === 'function'
      ? options.buildTransaction
      : () => null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : () => {};
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    return function finalizeStudioTransformSession(finalizeResult, completionPlan = {}) {
      onSessionEnd(finalizeResult, completionPlan);
      if (!completionPlan || !completionPlan.shouldPersist) return;
      const transaction = buildTransaction(finalizeResult);
      const canonicalDeck = buildCanonicalDeck
        ? buildCanonicalDeck(finalizeResult)
        : null;
      if (canonicalDeck) {
        saveHistoryState(false, transaction, canonicalDeck);
      } else {
        saveHistoryState(false, transaction);
      }
      triggerAutoSave();
      triggerAutoVersion(completionPlan.versionLabel);
    };
  }

  function attachStudioTransformPointerHandlers(doc, handlers, options = {}) {
    const body = doc && doc.body;
    if (!body || typeof body.addEventListener !== 'function' || !handlers) return false;

    if (options.preventNativeDrag !== false && typeof doc.addEventListener === 'function') {
      doc.addEventListener('dragstart', (event) => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
      }, true);
    }

    [
      ['pointerdown', handlers.handlePointerDown],
      ['pointermove', handlers.handlePointerMove],
      ['pointerup', handlers.handlePointerUp],
      ['pointercancel', handlers.handlePointerCancel]
    ].forEach(([eventName, handler]) => {
      if (typeof handler === 'function') body.addEventListener(eventName, handler, true);
    });

    const frameWindow = doc.defaultView;
    if (frameWindow
      && typeof frameWindow.addEventListener === 'function'
      && typeof handlers.handleWindowBlur === 'function') {
      frameWindow.addEventListener('blur', handlers.handleWindowBlur, true);
    }
    return true;
  }

  function buildStudioPositionedLayoutItem(element, options = {}) {
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

    return {
      element,
      absLeft: rectOnSlide.left,
      absTop: rectOnSlide.top,
      width: rectOnSlide.right - rectOnSlide.left,
      height: rectOnSlide.bottom - rectOnSlide.top,
      parentLeft: parentOnSlide.left,
      parentTop: parentOnSlide.top
    };
  }

  function buildStudioPositionedLayoutItems(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const items = selection
      .map((element) => buildStudioPositionedLayoutItem(element, options))
      .filter(Boolean);

    return items.length === selection.length ? items : [];
  }

  function getStudioTransformInlineStyle(element) {
    const style = element && element.style ? element.style : {};
    return ['position', 'margin', 'left', 'top', 'width', 'height'].reduce((inlineStyle, property) => {
      inlineStyle[property] = typeof style[property] === 'string' ? style[property] : '';
      return inlineStyle;
    }, {});
  }

  function buildStudioTransformSessionItem(element, options = {}) {
    const geometry = buildStudioPositionedLayoutItem(element, options);
    if (!geometry) {
      return null;
    }
    const sizingLockState = buildStudioTransformSizingLockState(element, options);

    return {
      element,
      startAbsLeft: geometry.absLeft,
      startAbsTop: geometry.absTop,
      startWidth: geometry.width,
      startHeight: geometry.height,
      parentOffsetLeft: geometry.parentLeft,
      parentOffsetTop: geometry.parentTop,
      lockWidth: sizingLockState.lockWidth,
      lockHeight: sizingLockState.lockHeight,
      startStyle: getStudioTransformInlineStyle(element)
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
      overlay: options.overlay || null,
      ...(Array.isArray(options.snapTargets) && options.snapTargets.length > 0
        ? { snapTargets: options.snapTargets }
        : {}),
      ...(options.lockAspectRatio ? { lockAspectRatio: true } : {})
    };
  }

  function startStudioTransformSession(options = {}) {
    const session = buildStudioTransformSession(options);
    const captureResult = captureStudioTransformSessionPointer(session);
    return {
      session,
      didCapture: captureResult.didCapture
    };
  }

  function resolveStudioTransformSessionStart(options = {}) {
    if (!options.slide) {
      return null;
    }

    const event = options.event || {};
    const pointerStartIntent = buildStudioTransformPointerStartIntent(event, {
      resolveEditableTarget: options.resolveEditableTarget,
      handleSelector: options.handleSelector,
      overlaySelector: options.overlaySelector
    });
    if (!pointerStartIntent.canStart) {
      return null;
    }

    const pointerSelectionState = resolveStudioTransformPointerSelectionState({
      getSelectionState: options.getSelectionState,
      selectElement: options.selectElement,
      handle: pointerStartIntent.handle,
      overlay: pointerStartIntent.overlay,
      dragTarget: pointerStartIntent.dragTarget,
      shiftKey: !!event.shiftKey
    });
    if (!pointerSelectionState.pointerSelectionPlan.hasTransformTarget) {
      return null;
    }

    const transformSelectionState = pointerSelectionState.selectionState;
    if (!transformSelectionState.canTransform) {
      return null;
    }

    const transformStartState = buildStudioTransformStartState(transformSelectionState.selection, {
      slide: options.slide,
      event,
      getSlideMetrics: options.getSlideMetrics,
      getPointerOnSlide: options.getPointerOnSlide,
      getSelectionBounds: options.getSelectionBounds,
      itemOptions: options.itemOptions,
      buildSessionItem: options.buildSessionItem,
      getSnapTargets: options.getSnapTargets
    });
    if (!transformStartState) {
      return null;
    }

    const overlay = typeof options.ensureOverlay === 'function'
      ? options.ensureOverlay(options.slide, transformStartState, pointerSelectionState)
      : options.overlay || null;
    const sessionStart = startStudioTransformSession({
      type: pointerStartIntent.handle ? 'resize' : 'drag',
      handleDir: pointerStartIntent.handle && typeof pointerStartIntent.handle.getAttribute === 'function'
        ? pointerStartIntent.handle.getAttribute('data-dir')
        : '',
      pointerId: event.pointerId,
      captureTarget: options.captureTarget || null,
      startClientX: Number.isFinite(event.clientX) ? event.clientX : 0,
      startClientY: Number.isFinite(event.clientY) ? event.clientY : 0,
      startPointer: transformStartState.startPointer,
      slideMetrics: transformStartState.slideMetrics,
      slideBounds: transformStartState.slideBounds,
      startBounds: transformStartState.startBounds,
      items: transformStartState.items,
      snapTargets: transformStartState.snapTargets,
      overlay
    });

    return {
      session: sessionStart.session,
      startBounds: transformStartState.startBounds,
      didCapture: sessionStart.didCapture
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

  function buildStudioTransformFrameState(session = {}, options = {}) {
    const motionState = buildStudioTransformMotionState(session, options);
    const progressResult = progressStudioTransformSession(session, {
      moveDistanceScreen: motionState.moveDistanceScreen,
      dragStartThresholdPx: normalizeStudioTransformDragStartThreshold(options.dragStartThresholdPx)
    });

    if (!progressResult.isActive) {
      return {
        isActive: false,
        motionState,
        progressResult,
        bounds: null,
        session
      };
    }

    let guides = [];
    const frameState = {
      isActive: true,
      motionState,
      progressResult,
      bounds: resolveStudioTransformBounds(session, {
        pointer: options.pointer,
        dx: motionState.dx,
        dy: motionState.dy,
        minSizePx: Number.isFinite(options.minSizePx) ? options.minSizePx : 0,
        dragOverflowMarginPx: Number.isFinite(options.dragOverflowMarginPx) ? options.dragOverflowMarginPx : 0,
        lockAspectRatio: !!options.lockAspectRatio,
        snapEnabled: options.snapEnabled,
        snapDistancePx: options.snapDistancePx,
        gridSizePx: options.gridSizePx,
        onGuides: (nextGuides) => {
          guides = nextGuides;
        }
      }),
      session
    };
    if (guides.length > 0) {
      frameState.guides = guides;
    }
    return frameState;
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

    const items = selection
      .map((element) => buildSessionItem(element, {
        ...options.itemOptions,
        slideMetrics
      }))
      .filter(Boolean);
    if (items.length !== selection.length || items.length === 0) {
      return null;
    }

    const getSnapTargets = typeof options.getSnapTargets === 'function'
      ? options.getSnapTargets
      : () => [];
    const snapTargets = getSnapTargets(options.slide, selection, slideMetrics);

    return {
      slideMetrics,
      slideBounds,
      startPointer,
      startBounds,
      items,
      ...(Array.isArray(snapTargets) && snapTargets.length > 0 ? { snapTargets } : {})
    };
  }

  function createStudioTransformPointerHandlers(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectionState = typeof options.getSelectionState === 'function'
      ? options.getSelectionState
      : () => ({ selection: [], canTransform: false });
    const selectElement = typeof options.selectElement === 'function'
      ? options.selectElement
      : () => {};
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getPointerOnSlide = typeof options.getPointerOnSlide === 'function'
      ? options.getPointerOnSlide
      : getStudioPointerOnSlide;
    const getSelectionBounds = typeof options.getSelectionBounds === 'function'
      ? options.getSelectionBounds
      : () => null;
    const ensureOverlay = typeof options.ensureOverlay === 'function'
      ? options.ensureOverlay
      : () => null;
    const resolveTransformSessionStart = typeof options.resolveTransformSessionStart === 'function'
      ? options.resolveTransformSessionStart
      : resolveStudioTransformSessionStart;
    const shouldHandlePointerEvent = typeof options.shouldHandlePointerEvent === 'function'
      ? options.shouldHandlePointerEvent
      : shouldHandleStudioTransformPointerEvent;
    const buildTransformFrameState = typeof options.buildTransformFrameState === 'function'
      ? options.buildTransformFrameState
      : buildStudioTransformFrameState;
    const applyTransformBounds = typeof options.applyTransformBounds === 'function'
      ? options.applyTransformBounds
      : applyStudioTransformBounds;
    const finalizeTransformSession = typeof options.finalizeTransformSession === 'function'
      ? options.finalizeTransformSession
      : finalizeStudioTransformSession;
    const buildCompletionPlan = typeof options.buildCompletionPlan === 'function'
      ? options.buildCompletionPlan
      : buildStudioTransformCompletionPlan;
    const itemOptions = options.itemOptions && typeof options.itemOptions === 'object'
      ? options.itemOptions
      : {};
    const dragStartThresholdPx = normalizeStudioTransformDragStartThreshold(options.dragStartThresholdPx);
    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 0;
    const dragOverflowMarginPx = Number.isFinite(options.dragOverflowMarginPx)
      ? options.dragOverflowMarginPx
      : 0;
    const getGridSizePx = typeof options.getGridSizePx === 'function'
      ? options.getGridSizePx
      : () => options.gridSizePx;
    let session = null;

    function finalizeSession(finalizeOptions = {}) {
      if (!session) {
        return null;
      }

      const finalizedSession = session;
      const finalization = finalizeStudioTransformInteractionSession(finalizedSession, {
        finalizeTransformSession,
        buildCompletionPlan,
        cancelled: finalizeOptions.cancelled === true
      });
      session = null;
      if (typeof options.onSessionFinalize === 'function') {
        options.onSessionFinalize(finalization.finalizeResult, finalization.completionPlan);
      }
      return finalization;
    }

    function handlePointerDown(event = {}) {
      const slide = getActiveSlide();
      const transformSessionStart = resolveTransformSessionStart({
        slide,
        event,
        getSelectionState,
        selectElement,
        resolveEditableTarget,
        getSlideMetrics,
        getPointerOnSlide,
        getSelectionBounds,
        ensureOverlay: (nextSlide) => ensureOverlay(nextSlide),
        itemOptions,
        captureTarget: options.captureTarget || null
      });
      if (!transformSessionStart) {
        return false;
      }

      session = transformSessionStart.session;
      if (typeof options.onSessionStart === 'function') {
        options.onSessionStart(transformSessionStart.startBounds, transformSessionStart);
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      return true;
    }

    function handlePointerMove(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) {
        return false;
      }

      const pointer = getPointerOnSlide(event, session.slideMetrics);
      const transformFrameState = buildTransformFrameState(session, {
        pointer,
        clientX: event.clientX,
        clientY: event.clientY,
        dragStartThresholdPx,
        minSizePx,
        dragOverflowMarginPx,
        gridSizePx: getGridSizePx(),
        lockAspectRatio: !!event.shiftKey
      });
      if (!transformFrameState.isActive) {
        return false;
      }

      const bounds = transformFrameState.bounds;
      applyTransformBounds(session, bounds, { minSizePx });
      if (typeof options.onSessionFrame === 'function') {
        options.onSessionFrame(bounds, transformFrameState);
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      return true;
    }

    function handlePointerUp(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) {
        return false;
      }
      finalizeSession();
      return true;
    }

    function handlePointerCancel(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) {
        return false;
      }
      finalizeSession({ cancelled: true });
      return true;
    }

    function handleWindowBlur() {
      finalizeSession({ cancelled: true });
    }

    return {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
      handleWindowBlur,
      finalizeSession,
      getSession: () => session
    };
  }

  function createStudioTransformFallbackPointerHandlers(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectionState = typeof options.getSelectionState === 'function'
      ? options.getSelectionState
      : () => ({ selection: [], canTransform: false });
    const selectElement = typeof options.selectElement === 'function'
      ? options.selectElement
      : () => {};
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getPointerOnSlide = typeof options.getPointerOnSlide === 'function'
      ? options.getPointerOnSlide
      : getStudioPointerOnSlide;
    const getSelectionBounds = typeof options.getSelectionBounds === 'function'
      ? options.getSelectionBounds
      : () => null;
    const ensureOverlay = typeof options.ensureOverlay === 'function'
      ? options.ensureOverlay
      : () => null;
    const resolveTransformSessionStart = typeof options.resolveTransformSessionStart === 'function'
      ? options.resolveTransformSessionStart
      : resolveStudioTransformSessionStart;
    const shouldHandlePointerEvent = typeof options.shouldHandlePointerEvent === 'function'
      ? options.shouldHandlePointerEvent
      : shouldHandleStudioTransformPointerEvent;
    const buildTransformFrameState = typeof options.buildTransformFrameState === 'function'
      ? options.buildTransformFrameState
      : buildStudioTransformFrameState;
    const applyTransformBounds = typeof options.applyTransformBounds === 'function'
      ? options.applyTransformBounds
      : applyStudioTransformBounds;
    const finalizeTransformSession = typeof options.finalizeTransformSession === 'function'
      ? options.finalizeTransformSession
      : finalizeStudioTransformSession;
    const buildCompletionPlan = typeof options.buildCompletionPlan === 'function'
      ? options.buildCompletionPlan
      : buildStudioTransformCompletionPlan;
    const itemOptions = options.itemOptions && typeof options.itemOptions === 'object'
      ? options.itemOptions
      : {};
    const dragStartThresholdPx = normalizeStudioTransformDragStartThreshold(options.dragStartThresholdPx);
    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 0;
    const dragOverflowMarginPx = Number.isFinite(options.dragOverflowMarginPx)
      ? options.dragOverflowMarginPx
      : 0;
    let session = null;

    function finalizeSession(finalizeOptions = {}) {
      if (!session) return null;

      const finalizedSession = session;
      const finalization = finalizeStudioTransformInteractionSession(finalizedSession, {
        finalizeTransformSession,
        buildCompletionPlan,
        cancelled: finalizeOptions.cancelled === true
      });
      session = null;
      if (typeof options.onSessionFinalize === 'function') {
        options.onSessionFinalize(finalization.finalizeResult, finalization.completionPlan);
      }
      return finalization;
    }

    function handlePointerDown(event = {}) {
      const slide = getActiveSlide();
      const transformSessionStart = resolveTransformSessionStart({
        slide,
        event,
        getSelectionState,
        selectElement,
        resolveEditableTarget,
        getSlideMetrics,
        getPointerOnSlide,
        getSelectionBounds,
        ensureOverlay: (nextSlide) => ensureOverlay(nextSlide),
        itemOptions,
        captureTarget: options.captureTarget || null
      });
      if (!transformSessionStart) return false;

      session = transformSessionStart.session;
      if (typeof options.onSessionStart === 'function') {
        options.onSessionStart(transformSessionStart.startBounds, transformSessionStart);
      }
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      return true;
    }

    function handlePointerMove(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) return false;

      const pointer = getPointerOnSlide(event, session.slideMetrics);
      const transformFrameState = buildTransformFrameState(session, {
        pointer,
        clientX: event.clientX,
        clientY: event.clientY,
        dragStartThresholdPx,
        minSizePx,
        dragOverflowMarginPx
      });
      if (!transformFrameState.isActive) return false;

      const bounds = transformFrameState.bounds;
      applyTransformBounds(session, bounds, { minSizePx });
      if (typeof options.onSessionFrame === 'function') {
        options.onSessionFrame(bounds, transformFrameState);
      }
      if (typeof event.preventDefault === 'function') event.preventDefault();
      return true;
    }

    function handlePointerUp(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) return false;
      finalizeSession();
      return true;
    }

    function handlePointerCancel(event = {}) {
      if (!shouldHandlePointerEvent(session, event)) return false;
      finalizeSession({ cancelled: true });
      return true;
    }

    function handleWindowBlur() {
      finalizeSession({ cancelled: true });
    }

    return {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
      handleWindowBlur,
      finalizeSession,
      getSession: () => session
    };
  }

  return {
    getStudioTransformSelection,
    getStudioSlideMetrics,
    getStudioRectOnSlide,
    getStudioPointerOnSlide,
    buildStudioTransformSelectionState,
    buildStudioTransformPointerSelectionPlan,
    buildStudioTransformPointerStartIntent,
    resolveStudioTransformPointerSelectionState,
    shouldHandleStudioTransformPointerEvent,
    canStudioTransformSelection,
    isStudioFreeformPositioned,
    buildStudioTransformSizingLockState,
    DEFAULT_DRAG_START_THRESHOLD_PX,
    normalizeStudioTransformDragStartThreshold,
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
    restoreStudioTransformSessionStyles,
    finalizeStudioTransformSession,
    buildStudioTransformCompletionPlan,
    finalizeStudioTransformInteractionSession,
    buildStudioTransformStyleTransaction,
    buildStudioTransformCanonicalLayoutUpdates,
    createStudioTransformSessionFinalizer,
    attachStudioTransformPointerHandlers,
    buildStudioPositionedLayoutItem,
    buildStudioPositionedLayoutItems,
    getStudioTransformInlineStyle,
    buildStudioTransformSessionItem,
    buildStudioTransformSession,
    startStudioTransformSession,
    resolveStudioTransformSessionStart,
    buildStudioTransformMotionState,
    buildStudioTransformFrameState,
    buildStudioTransformStartState,
    createStudioTransformPointerHandlers,
    createStudioTransformFallbackPointerHandlers,
    snapStudioTransformBounds
  };
});
