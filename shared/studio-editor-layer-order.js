(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrder = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLayerOrderSelection(targetElements = [], options = {}) {
    const selection = Array.isArray(targetElements) ? targetElements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const eligibleSelection = selection.filter((element) => isEligibleElement(element));
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : null;

    if (!orderedElements) {
      return eligibleSelection;
    }
    return orderedElements.filter((element) => eligibleSelection.includes(element));
  }

  function buildStudioLayerOrderActionState(targetElements = [], options = {}) {
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : [];
    const selection = getStudioLayerOrderSelection(targetElements, {
      ...options,
      orderedElements
    });
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const hasSelection = selection.length > 0;
    const hasLockedSelection = selection.some((element) => isLocked(element));
    const canReorder = hasSelection && !hasLockedSelection && orderedElements.length > 0;

    const canRunAction = (action) => {
      if (!canReorder) {
        return false;
      }
      return buildStudioReorderedLayerOrder(orderedElements, selection, action, options).didChange;
    };

    return {
      selection,
      hasSelection,
      hasLockedSelection,
      canReorder,
      canBringToFront: canRunAction('front'),
      canSendToBack: canRunAction('back'),
      canBringForward: canRunAction('forward'),
      canSendBackward: canRunAction('backward')
    };
  }

  function buildStudioReorderedLayerOrder(initialOrder = [], targetElements = [], action, options = {}) {
    const nextOrder = Array.isArray(initialOrder) ? [...initialOrder] : [];
    if (nextOrder.length === 0) {
      return {
        didChange: false,
        nextOrder
      };
    }

    const selection = getStudioLayerOrderSelection(targetElements, {
      ...options,
      orderedElements: nextOrder
    });
    if (selection.length === 0) {
      return {
        didChange: false,
        nextOrder
      };
    }

    const targetSet = new Set(selection);

    if (action === 'front') {
      nextOrder.splice(0, nextOrder.length, ...nextOrder.filter((element) => !targetSet.has(element)), ...selection);
    } else if (action === 'back') {
      nextOrder.splice(0, nextOrder.length, ...selection, ...nextOrder.filter((element) => !targetSet.has(element)));
    } else if (action === 'forward') {
      for (let index = nextOrder.length - 2; index >= 0; index -= 1) {
        if (targetSet.has(nextOrder[index]) && !targetSet.has(nextOrder[index + 1])) {
          [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
        }
      }
    } else if (action === 'backward') {
      for (let index = 1; index < nextOrder.length; index += 1) {
        if (targetSet.has(nextOrder[index]) && !targetSet.has(nextOrder[index - 1])) {
          [nextOrder[index], nextOrder[index - 1]] = [nextOrder[index - 1], nextOrder[index]];
        }
      }
    } else {
      return {
        didChange: false,
        nextOrder
      };
    }

    const didChange = nextOrder.some((element, index) => element !== initialOrder[index]);
    return {
      didChange,
      nextOrder
    };
  }

  return {
    getStudioLayerOrderSelection,
    buildStudioLayerOrderActionState,
    buildStudioReorderedLayerOrder
  };
});
