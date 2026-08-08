(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTransformController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const transformApi = resolveDependency('transformApi', 'SlideNextStudioEditorTransform');
    const canonicalTransformApi = resolveDependency(
      'canonicalTransformApi',
      'SlideNextStudioEditorCanonicalTransform'
    );
    const canonicalDeckApi = resolveDependency('canonicalDeckApi', 'SlideNextCanonicalDeck');
    const transactionApi = resolveDependency('transactionApi', 'SlideNextStudioEditorTransaction');
    const domApi = resolveDependency('domApi', 'SlideNextStudioEditorDom');
    const interactionOptionsApi = resolveDependency(
      'interactionOptionsApi',
      'SlideNextStudioEditorInteractionOptions'
    );
    const interactionsApi = resolveDependency(
      'interactionsApi',
      'SlideNextStudioEditorInteractions'
    );
    const eventsApi = resolveDependency('eventsApi', 'SlideNextStudioEditorEvents');
    const selectionBoundsApi = resolveDependency(
      'selectionBoundsApi',
      'SlideNextStudioEditorSelectionBounds'
    );
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getTransformSelectionState = typeof options.getTransformSelectionState === 'function'
      ? options.getTransformSelectionState
      : () => ({ selection: [], canTransform: false });
    const selectElement = typeof options.selectElement === 'function' ? options.selectElement : () => {};
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : (target) => target;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getPointerOnSlide = typeof options.getPointerOnSlide === 'function'
      ? options.getPointerOnSlide
      : () => null;
    const getSelectionBounds = typeof options.getSelectionBounds === 'function'
      ? options.getSelectionBounds
      : () => null;
    const getSlideEditableElements = typeof options.getSlideEditableElements === 'function'
      ? options.getSlideEditableElements
      : null;
    const isHidden = typeof options.isHidden === 'function' ? options.isHidden : null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : null;
    const ensureOverlay = typeof options.ensureOverlay === 'function' ? options.ensureOverlay : () => {};
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getMarqueeElements = typeof options.getMarqueeElements === 'function'
      ? options.getMarqueeElements
      : () => [];
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => {};
    const updateDragHud = typeof options.updateDragHud === 'function' ? options.updateDragHud : () => {};
    const renderGuides = typeof options.renderGuides === 'function' ? options.renderGuides : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const hideGuides = typeof options.hideGuides === 'function' ? options.hideGuides : () => {};
    const hideDragHud = typeof options.hideDragHud === 'function' ? options.hideDragHud : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    const renderMarqueeSelection = typeof options.renderMarqueeSelection === 'function'
      ? options.renderMarqueeSelection
      : () => {};
    const clearMarqueeSelection = typeof options.clearMarqueeSelection === 'function'
      ? options.clearMarqueeSelection
      : () => {};
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
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : null;
    const getGridSizePx = typeof options.getGridSizePx === 'function'
      ? options.getGridSizePx
      : () => null;
    const getIsDraggingElement = typeof options.getIsDraggingElement === 'function'
      ? options.getIsDraggingElement
      : () => false;
    const setIsDraggingElement = typeof options.setIsDraggingElement === 'function'
      ? options.setIsDraggingElement
      : () => {};
    const setSuppressNextFrameClick = typeof options.setSuppressNextFrameClick === 'function'
      ? options.setSuppressNextFrameClick
      : () => {};
    const dragStartThresholdPx = Number.isFinite(options.dragStartThresholdPx)
      ? options.dragStartThresholdPx
      : 4;
    const minSizePx = Number.isFinite(options.minSizePx) ? options.minSizePx : 24;
    const dragOverflowMarginPx = Number.isFinite(options.dragOverflowMarginPx)
      ? options.dragOverflowMarginPx
      : 280;
    const snapDistancePx = Number.isFinite(options.snapDistancePx) ? options.snapDistancePx : 12;

    function getCanonicalTransformBuilders() {
      const buildCanonicalLayoutUpdates = transformApi
        && typeof transformApi.buildStudioTransformCanonicalLayoutUpdates === 'function'
        ? transformApi.buildStudioTransformCanonicalLayoutUpdates
        : null;
      if (!canonicalTransformApi
        || typeof canonicalTransformApi.createStudioCanonicalTransformMutationBuilders !== 'function') {
        return null;
      }
      return canonicalTransformApi.createStudioCanonicalTransformMutationBuilders({
        canonicalDeckApi,
        buildCanonicalDeck: buildCanonicalDeck
          ? (sourceDocument) => buildCanonicalDeck(sourceDocument)
          : null,
        buildCanonicalLayoutUpdates,
        getElementId: assignElementId
      });
    }

    function setup(doc) {
      let canonicalDeckBeforeTransform = null;
      const captureCanonicalTransformBaseline = () => {
        const builders = getCanonicalTransformBuilders();
        return builders && typeof builders.buildCanonicalTransformBaseline === 'function'
          ? builders.buildCanonicalTransformBaseline({ sourceDocument: doc })
          : null;
      };
      const buildTransformTransaction = (finalizeResult) => {
        if (!transformApi || typeof transformApi.buildStudioTransformStyleTransaction !== 'function') {
          return null;
        }
        return transformApi.buildStudioTransformStyleTransaction(finalizeResult, {
          transactionApi,
          assignEditorElementId: assignElementId
        });
      };
      const buildCanonicalTransformDeck = (finalizeResult) => {
        const builders = getCanonicalTransformBuilders();
        if (!builders || typeof builders.buildCanonicalTransformDeck !== 'function') {
          canonicalDeckBeforeTransform = null;
          return null;
        }
        const canonicalDeckBeforeMutation = canonicalDeckBeforeTransform;
        try {
          return builders.buildCanonicalTransformDeck(finalizeResult, {
            sourceDocument: doc,
            ...(canonicalDeckBeforeMutation ? { canonicalDeckBeforeMutation } : {})
          });
        } finally {
          canonicalDeckBeforeTransform = null;
        }
      };
      const createTransformSessionFinalizer = transformApi
        && typeof transformApi.createStudioTransformSessionFinalizer === 'function'
        ? transformApi.createStudioTransformSessionFinalizer
        : null;
      const finalizeTransformSession = createTransformSessionFinalizer
        ? createTransformSessionFinalizer({
            onSessionEnd: (finalizeResult, completionPlan = {}) => {
              setIsDraggingElement(false);
              hideGuides();
              hideDragHud();
              syncSelectionOverlay();
              syncInspectorForSelection();
              if (!completionPlan.shouldPersist) canonicalDeckBeforeTransform = null;
            },
            buildTransaction: buildTransformTransaction,
            buildCanonicalDeck: buildCanonicalTransformDeck,
            saveHistoryState,
            triggerAutoSave,
            triggerAutoVersion
          })
        : () => {};
      const attachSharedStudioPointerHandlers = eventsApi
        && typeof eventsApi.attachStudioPointerHandlers === 'function'
        ? eventsApi.attachStudioPointerHandlers
        : null;
      const attachStudioPointerHandlers = (handlers, attachHandlers, attachOptions = {}) => {
        if (typeof attachHandlers === 'function') return attachHandlers(doc, handlers);
        if (attachSharedStudioPointerHandlers) {
          return attachSharedStudioPointerHandlers(doc, handlers, attachOptions);
        }
        return false;
      };
      const buildStudioTransformInteractionOptions = (overrides = {}) => (
        interactionOptionsApi
        && typeof interactionOptionsApi.buildStudioTransformInteractionOptions === 'function'
          ? interactionOptionsApi.buildStudioTransformInteractionOptions({
              transformApi,
              getActiveSlide: () => getActiveSlide(doc),
              getSelectionState: getTransformSelectionState,
              selectElement,
              resolveEditableTarget,
              getSlideMetrics,
              getPointerOnSlide,
              getSelectionBounds,
              getSlideEditableElements,
              isHidden,
              getRectOnSlide,
              ensureOverlay: (slide) => ensureOverlay(slide),
              itemOptions: {
                getClosestPositionedAncestor,
                getRectOnSlide
              },
              captureTarget: doc && doc.body,
              dragStartThresholdPx,
              minSizePx,
              dragOverflowMarginPx,
              snapDistancePx,
              getGridSizePx,
              onSessionStart: (startBounds) => {
                canonicalDeckBeforeTransform = captureCanonicalTransformBaseline();
                updateDragHud(startBounds);
                setIsDraggingElement(true);
              },
              onSessionFrame: (bounds, frameState = {}) => {
                renderGuides(frameState.guides || []);
                syncSelectionOverlay();
                updateDragHud(bounds);
              },
              onSessionFinalize: finalizeTransformSession
            }, overrides)
          : {}
      );
      const buildStudioMarqueeInteractionOptions = (overrides = {}) => (
        interactionOptionsApi
        && typeof interactionOptionsApi.buildStudioMarqueeInteractionOptions === 'function'
          ? interactionOptionsApi.buildStudioMarqueeInteractionOptions({
              selectionBoundsApi,
              getActiveSlide: () => getActiveSlide(doc),
              resolveEditableTarget,
              getSlideMetrics,
              getPointerOnSlide,
              getMarqueeElements,
              getMarqueeSelection: null,
              getSelectedElements,
              captureTarget: doc && doc.body,
              dragStartThresholdPx,
              isHidden,
              getRectOnSlide,
              onSessionStart: () => {
                setIsDraggingElement(true);
                hideGuides();
                hideDragHud();
              },
              onSessionFrame: (rect) => renderMarqueeSelection(rect),
              onSelectionSessionFinalize: () => {
                setIsDraggingElement(false);
                hideGuides();
                hideDragHud();
                clearMarqueeSelection();
              },
              commitSelectionState,
              syncSelectionOverlay,
              setSuppressNextFrameClick
            }, overrides)
          : {}
      );
      const attachInteractions = interactionsApi
        && typeof interactionsApi.attachStudioEditorInteractionHandlers === 'function'
        ? interactionsApi.attachStudioEditorInteractionHandlers
        : null;
      if (attachInteractions) {
        const didAttach = attachInteractions(doc, {
          transformOptions: buildStudioTransformInteractionOptions(),
          marqueeOptions: buildStudioMarqueeInteractionOptions()
        });
        if (didAttach) return true;
      }

      const createTransformPointerHandlers = transformApi
        && typeof transformApi.createStudioTransformPointerHandlers === 'function'
        ? transformApi.createStudioTransformPointerHandlers
        : null;
      if (createTransformPointerHandlers) {
        const transformHandlers = createTransformPointerHandlers(
          buildStudioTransformInteractionOptions()
        );
        const attachTransformPointerHandlers = transformApi
          && typeof transformApi.attachStudioTransformPointerHandlers === 'function'
          ? transformApi.attachStudioTransformPointerHandlers
          : null;
        attachStudioPointerHandlers(transformHandlers, attachTransformPointerHandlers, {
          preventNativeDrag: true
        });

        const createMarqueeSelectionHandlers = eventsApi
          && typeof eventsApi.createStudioMarqueeSelectionHandlers === 'function'
          ? eventsApi.createStudioMarqueeSelectionHandlers
          : null;
        const createMarqueePointerHandlers = eventsApi
          && typeof eventsApi.createStudioMarqueePointerHandlers === 'function'
          ? eventsApi.createStudioMarqueePointerHandlers
          : null;
        if (createMarqueeSelectionHandlers || createMarqueePointerHandlers) {
          const marqueeHandlers = (createMarqueeSelectionHandlers || createMarqueePointerHandlers)(
            buildStudioMarqueeInteractionOptions({
              onSelectionSessionFinalize: createMarqueeSelectionHandlers
                ? () => {
                    setIsDraggingElement(false);
                    hideGuides();
                    hideDragHud();
                    clearMarqueeSelection();
                  }
                : undefined,
              onSessionFinalize: createMarqueeSelectionHandlers
                ? undefined
                : (result, session) => {
                    setIsDraggingElement(false);
                    hideGuides();
                    hideDragHud();
                    clearMarqueeSelection();
                    if (result.cancelled || !result.didSelect) {
                      syncSelectionOverlay();
                      return;
                    }
                    const previousSelection = result.additive ? session.previousSelection : [];
                    const nextSelection = Array.from(new Set([
                      ...previousSelection,
                      ...(result.selection || [])
                    ]));
                    commitSelectionState({ selectedElements: nextSelection });
                    setSuppressNextFrameClick(true);
                  }
            })
          );
          const attachMarqueePointerHandlers = eventsApi
            && typeof eventsApi.attachStudioMarqueePointerHandlers === 'function'
            ? eventsApi.attachStudioMarqueePointerHandlers
            : null;
          attachStudioPointerHandlers(marqueeHandlers, attachMarqueePointerHandlers);
        }
        return true;
      }

      const createFallbackTransformHandlers = transformApi
        && typeof transformApi.createStudioTransformFallbackPointerHandlers === 'function'
        ? transformApi.createStudioTransformFallbackPointerHandlers
        : null;
      if (!createFallbackTransformHandlers) return false;
      const fallbackTransformHandlers = createFallbackTransformHandlers(
        buildStudioTransformInteractionOptions({
          onSessionFrame: (bounds) => {
            syncSelectionOverlay();
            updateDragHud(bounds);
          }
        })
      );
      const attachFallbackTransformHandlers = transformApi
        && typeof transformApi.attachStudioTransformPointerHandlers === 'function'
        ? transformApi.attachStudioTransformPointerHandlers
        : null;
      attachStudioPointerHandlers(fallbackTransformHandlers, attachFallbackTransformHandlers, {
        preventNativeDrag: true
      });
      return true;
    }

    return { setup };
  }

  return {
    createStudioEditorTransformController
  };
});
