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

  function normalizeStudioEditorTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') return null;
    if (transaction.kind !== STUDIO_EDITOR_TRANSACTION_KIND
      || transaction.version !== STUDIO_EDITOR_TRANSACTION_VERSION
      || !Array.isArray(transaction.operations)) {
      return null;
    }
    return createStudioStyleTransaction(transaction.operations.map((operation) => ({
      elementId: operation && operation.elementId,
      before: operation && operation.before,
      after: operation && operation.after
    })));
  }

  function isStudioEditorTransaction(transaction) {
    return !!normalizeStudioEditorTransaction(transaction);
  }

  function mergeStudioStyleTransactions(firstTransaction, secondTransaction) {
    const first = normalizeStudioEditorTransaction(firstTransaction);
    const second = normalizeStudioEditorTransaction(secondTransaction);
    if (!first) return second;
    if (!second) return first;

    const operationsByElementId = new Map();
    [...first.operations, ...second.operations].forEach((operation) => {
      const existingOperation = operationsByElementId.get(operation.elementId);
      if (!existingOperation) {
        operationsByElementId.set(operation.elementId, {
          elementId: operation.elementId,
          before: { ...operation.before },
          after: { ...operation.after }
        });
        return;
      }

      existingOperation.before = {
        ...operation.before,
        ...existingOperation.before
      };
      existingOperation.after = {
        ...existingOperation.after,
        ...operation.after
      };
    });

    return createStudioStyleTransaction(Array.from(operationsByElementId.values()));
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
    if (resolvedOperations.some(({ element }) => !element || !element.style)) {
      return {
        didApply: false,
        appliedCount: 0,
        direction: nextDirection
      };
    }

    resolvedOperations.forEach(({ operation, element }) => {
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
    createStudioStyleTransaction,
    normalizeStudioEditorTransaction,
    isStudioEditorTransaction,
    mergeStudioStyleTransactions,
    applyStudioEditorTransaction
  };
});
