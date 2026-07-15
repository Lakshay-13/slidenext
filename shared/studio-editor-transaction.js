(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDIO_EDITOR_TRANSACTION_KIND = 'slidenext.editor.transaction';
  const STUDIO_EDITOR_TRANSACTION_VERSION = 1;
  const STUDIO_VISIBILITY_DATASET_KEYS = [
    'editorHidden',
    'editorPrevDisplay',
    'editorPrevAriaHidden'
  ];

  function normalizeStylePatch(patch) {
    if (!patch || typeof patch !== 'object') return {};

    return Object.keys(patch).reduce((normalizedPatch, property) => {
      if (!property || !/^[A-Za-z][A-Za-z0-9-]*$/.test(property)) {
        return normalizedPatch;
      }
      const value = patch[property];
      if (value === null || value === undefined) {
        normalizedPatch[property] = '';
      } else if (typeof value === 'string' || typeof value === 'number') {
        normalizedPatch[property] = `${value}`;
      }
      return normalizedPatch;
    }, {});
  }

  function normalizeTransactionValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }
    return '';
  }

  function createStudioStyleTransaction(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const operations = sourceItems.reduce((nextOperations, item) => {
      if (!item || typeof item !== 'object') return nextOperations;
      const elementId = typeof item.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(item.element);
      if (!elementId) return nextOperations;

      const before = normalizeStylePatch(item.before);
      const after = normalizeStylePatch(item.after);
      const properties = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      const nextBefore = {};
      const nextAfter = {};
      properties.forEach((property) => {
        const beforeValue = Object.prototype.hasOwnProperty.call(before, property) ? before[property] : '';
        const afterValue = Object.prototype.hasOwnProperty.call(after, property) ? after[property] : '';
        if (beforeValue === afterValue) return;
        nextBefore[property] = beforeValue;
        nextAfter[property] = afterValue;
      });
      if (Object.keys(nextBefore).length === 0) return nextOperations;

      nextOperations.push({
        type: 'style',
        elementId,
        before: nextBefore,
        after: nextAfter
      });
      return nextOperations;
    }, []);

    if (operations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations
    };
  }

  function createStudioPositionTransaction(items = [], options = {}) {
    const sourceItems = Array.isArray(items) ? items : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const transactionItems = sourceItems.map((item) => {
      const element = item && item.element;
      const style = element && element.style ? element.style : {};
      return {
        element,
        elementId: item && item.elementId,
        before: item && item.before
          ? item.before
          : {
              left: typeof style.left === 'string' ? style.left : '',
              top: typeof style.top === 'string' ? style.top : ''
            },
        after: item && item.after
          ? item.after
          : {
              left: Number.isFinite(item && item.nextLeft) ? `${item.nextLeft}px` : style.left || '',
              top: Number.isFinite(item && item.nextTop) ? `${item.nextTop}px` : style.top || ''
            }
      };
    });
    return createStudioStyleTransaction(transactionItems, { getElementId });
  }

  function applyStudioPositionLayoutWithTransaction(items = [], options = {}) {
    const nextItems = Array.isArray(items) ? items : [];
    const createPositionTransaction = typeof options.createPositionTransaction === 'function'
      ? options.createPositionTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const applyLayout = typeof options.applyLayout === 'function'
      ? options.applyLayout
      : null;

    if (applyLayout) {
      const mutation = applyLayout(nextItems, {
        createPositionTransaction,
        getElementId
      });
      return mutation && typeof mutation === 'object'
        ? mutation
        : { didApply: false, transaction: null };
    }

    const transaction = createPositionTransaction
      ? createPositionTransaction(nextItems, { getElementId })
      : null;
    let didApply = false;
    nextItems.forEach((item) => {
      if (!item || !item.element || !item.element.style) return;
      item.element.style.left = `${item.nextLeft}px`;
      item.element.style.top = `${item.nextTop}px`;
      didApply = true;
    });
    return {
      didApply,
      transaction
    };
  }

  function createStudioPropertyTransaction(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const operations = sourceItems.reduce((nextOperations, item) => {
      if (!item || typeof item !== 'object') return nextOperations;
      const elementId = typeof item.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(item.element);
      const property = typeof item.property === 'string' && /^[A-Za-z][A-Za-z0-9-]*$/.test(item.property)
        ? item.property
        : '';
      if (!elementId || !property) return nextOperations;

      const before = normalizeTransactionValue(item.before);
      const after = normalizeTransactionValue(item.after);
      if (before === after) return nextOperations;
      nextOperations.push({
        type: 'property',
        elementId,
        property,
        before,
        after
      });
      return nextOperations;
    }, []);

    if (operations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations
    };
  }

  function createStudioDatasetTransaction(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const operations = sourceItems.reduce((nextOperations, item) => {
      if (!item || typeof item !== 'object') return nextOperations;
      const elementId = typeof item.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(item.element);
      const property = typeof item.property === 'string' && /^[A-Za-z][A-Za-z0-9-]*$/.test(item.property)
        ? item.property
        : '';
      if (!elementId || !property) return nextOperations;

      const before = normalizeTransactionValue(item.before);
      const after = normalizeTransactionValue(item.after);
      if (before === after) return nextOperations;
      nextOperations.push({
        type: 'dataset',
        elementId,
        property,
        before,
        after
      });
      return nextOperations;
    }, []);

    if (operations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations
    };
  }

  function normalizeVisibilityState(state) {
    if (!state || typeof state !== 'object') return null;
    const sourceDataset = state.dataset && typeof state.dataset === 'object'
      ? state.dataset
      : {};
    const dataset = {};
    STUDIO_VISIBILITY_DATASET_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(sourceDataset, key)) {
        dataset[key] = normalizeTransactionValue(sourceDataset[key]);
      }
    });
    return {
      hidden: state.hidden === true,
      display: normalizeTransactionValue(state.display),
      ariaHidden: typeof state.ariaHidden === 'string' ? state.ariaHidden : null,
      hasHiddenClass: state.hasHiddenClass === true,
      dataset
    };
  }

  function createStudioVisibilityTransaction(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const operations = sourceItems.reduce((nextOperations, item) => {
      if (!item || typeof item !== 'object') return nextOperations;
      const elementId = typeof item.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(item.element);
      const before = normalizeVisibilityState(item.before);
      const after = normalizeVisibilityState(item.after);
      if (!elementId || !before || !after || JSON.stringify(before) === JSON.stringify(after)) {
        return nextOperations;
      }
      nextOperations.push({
        type: 'visibility',
        elementId,
        before,
        after
      });
      return nextOperations;
    }, []);

    if (operations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations
    };
  }

  function createStudioMarkupTransaction(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const operations = sourceItems.reduce((nextOperations, item) => {
      if (!item || typeof item !== 'object') return nextOperations;
      const elementId = typeof item.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(item.element);
      const before = normalizeTransactionValue(item.before);
      const after = normalizeTransactionValue(item.after);
      if (!elementId || before === after) return nextOperations;
      nextOperations.push({
        type: 'markup',
        elementId,
        before,
        after
      });
      return nextOperations;
    }, []);

    if (operations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations
    };
  }

  function createStudioMarkupTransactionCapture(items = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const sourceItems = Array.isArray(items) ? items : [];
    const seenElementIds = new Set();
    const captureItems = sourceItems.reduce((nextItems, item) => {
      const element = item && item.element;
      const elementId = typeof item?.elementId === 'string' && item.elementId.trim()
        ? item.elementId.trim()
        : getElementId(element);
      if (!element || !elementId || seenElementIds.has(elementId)) return nextItems;
      seenElementIds.add(elementId);
      nextItems.push({
        element,
        elementId,
        before: typeof element.innerHTML === 'string' ? element.innerHTML : ''
      });
      return nextItems;
    }, []);
    if (captureItems.length === 0) return null;

    return {
      createTransaction() {
        return createStudioMarkupTransaction(captureItems.map((item) => ({
          element: item.element,
          elementId: item.elementId,
          before: item.before,
          after: typeof item.element.innerHTML === 'string' ? item.element.innerHTML : ''
        })));
      }
    };
  }

  function normalizeStudioEditorTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') return null;
    if (transaction.kind !== STUDIO_EDITOR_TRANSACTION_KIND
      || transaction.version !== STUDIO_EDITOR_TRANSACTION_VERSION
      || !Array.isArray(transaction.operations)) {
      return null;
    }
    const normalizedOperations = transaction.operations.reduce((nextOperations, operation) => {
      if (!operation || typeof operation !== 'object') return nextOperations;
      const nextTransaction = operation.type === 'property'
        ? createStudioPropertyTransaction([{
            elementId: operation.elementId,
            property: operation.property,
            before: operation.before,
            after: operation.after
          }])
        : operation.type === 'dataset'
          ? createStudioDatasetTransaction([{
              elementId: operation.elementId,
              property: operation.property,
              before: operation.before,
              after: operation.after
            }])
        : operation.type === 'visibility'
          ? createStudioVisibilityTransaction([{
              elementId: operation.elementId,
              before: operation.before,
              after: operation.after
            }])
        : operation.type === 'markup'
          ? createStudioMarkupTransaction([{
              elementId: operation.elementId,
              before: operation.before,
              after: operation.after
            }])
        : operation.type === 'style'
          ? createStudioStyleTransaction([{
              elementId: operation.elementId,
              before: operation.before,
              after: operation.after
            }])
          : null;
      if (nextTransaction) {
        nextOperations.push(...nextTransaction.operations);
      }
      return nextOperations;
    }, []);
    if (normalizedOperations.length === 0) return null;
    return {
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations: normalizedOperations
    };
  }

  function isStudioEditorTransaction(transaction) {
    return !!normalizeStudioEditorTransaction(transaction);
  }

  function mergeStudioEditorTransactions(firstTransaction, secondTransaction) {
    const first = normalizeStudioEditorTransaction(firstTransaction);
    const second = normalizeStudioEditorTransaction(secondTransaction);
    if (!first) return second;
    if (!second) return first;

    const operationsByKey = new Map();
    [...first.operations, ...second.operations].forEach((operation) => {
      const operationKey = operation.type === 'property' || operation.type === 'dataset'
        ? `${operation.type}:${operation.elementId}:${operation.property}`
        : `${operation.type}:${operation.elementId}`;
      const existingOperation = operationsByKey.get(operationKey);
      if (!existingOperation) {
        operationsByKey.set(operationKey, operation.type === 'property' || operation.type === 'dataset'
          ? { ...operation }
          : operation.type === 'visibility'
            ? {
                type: 'visibility',
                elementId: operation.elementId,
                before: { ...operation.before, dataset: { ...operation.before.dataset } },
                after: { ...operation.after, dataset: { ...operation.after.dataset } }
              }
          : operation.type === 'markup'
            ? { ...operation }
          : {
              type: 'style',
              elementId: operation.elementId,
              before: { ...operation.before },
              after: { ...operation.after }
            });
        return;
      }

      if (operation.type === 'property' || operation.type === 'dataset') {
        existingOperation.after = operation.after;
      } else if (operation.type === 'visibility') {
        existingOperation.after = {
          ...operation.after,
          dataset: { ...operation.after.dataset }
        };
      } else if (operation.type === 'markup') {
        existingOperation.after = operation.after;
      } else {
        existingOperation.before = {
          ...operation.before,
          ...existingOperation.before
        };
        existingOperation.after = {
          ...existingOperation.after,
          ...operation.after
        };
      }
    });

    return normalizeStudioEditorTransaction({
      kind: STUDIO_EDITOR_TRANSACTION_KIND,
      version: STUDIO_EDITOR_TRANSACTION_VERSION,
      operations: Array.from(operationsByKey.values())
    });
  }

  function mergeStudioStyleTransactions(firstTransaction, secondTransaction) {
    return mergeStudioEditorTransactions(firstTransaction, secondTransaction);
  }

  function applyStudioEditorTransaction(transaction, direction, options = {}) {
    const normalizedTransaction = normalizeStudioEditorTransaction(transaction);
    const nextDirection = direction === 'undo' || direction === 'redo' ? direction : '';
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;
    if (!normalizedTransaction || !nextDirection) {
      return {
        didApply: false,
        appliedCount: 0,
        direction: nextDirection
      };
    }

    const resolvedOperations = normalizedTransaction.operations.map((operation) => ({
      operation,
      element: getElementById(operation.elementId)
    }));
    const applyVisibilityState = typeof options.applyVisibilityState === 'function'
      ? options.applyVisibilityState
      : null;
    const applyMarkupState = typeof options.applyMarkupState === 'function'
      ? options.applyMarkupState
      : null;
    if (resolvedOperations.some(({ operation, element }) => {
      return !element
        || (operation.type === 'style' && !element.style)
        || (operation.type === 'dataset' && !element.dataset)
        || (operation.type === 'visibility' && !applyVisibilityState)
        || (operation.type === 'markup' && (!element || !applyMarkupState));
    })) {
      return {
        didApply: false,
        appliedCount: 0,
        direction: nextDirection
      };
    }

    resolvedOperations.forEach(({ operation, element }) => {
      if (operation.type === 'property') {
        element[operation.property] = nextDirection === 'undo' ? operation.before : operation.after;
        return;
      }
      if (operation.type === 'dataset') {
        const value = nextDirection === 'undo' ? operation.before : operation.after;
        if (value) {
          element.dataset[operation.property] = value;
        } else {
          delete element.dataset[operation.property];
        }
        return;
      }
      if (operation.type === 'visibility') {
        const state = nextDirection === 'undo' ? operation.before : operation.after;
        applyVisibilityState(element, state);
        return;
      }
      if (operation.type === 'markup') {
        const markup = nextDirection === 'undo' ? operation.before : operation.after;
        applyMarkupState(element, markup);
        return;
      }
      const patch = nextDirection === 'undo' ? operation.before : operation.after;
      Object.keys(patch).forEach((property) => {
        element.style[property] = patch[property];
      });
    });

    return {
      didApply: true,
      appliedCount: resolvedOperations.length,
      direction: nextDirection
    };
  }

  return {
    STUDIO_EDITOR_TRANSACTION_KIND,
    STUDIO_EDITOR_TRANSACTION_VERSION,
    normalizeStylePatch,
    normalizeTransactionValue,
    createStudioStyleTransaction,
    createStudioPositionTransaction,
    applyStudioPositionLayoutWithTransaction,
    createStudioPropertyTransaction,
    createStudioDatasetTransaction,
    createStudioVisibilityTransaction,
    createStudioMarkupTransaction,
    createStudioMarkupTransactionCapture,
    normalizeVisibilityState,
    normalizeStudioEditorTransaction,
    isStudioEditorTransaction,
    mergeStudioEditorTransactions,
    mergeStudioStyleTransactions,
    applyStudioEditorTransaction
  };
});
