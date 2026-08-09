(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorChartMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_CHART_VALUES = 12;

  function isStudioChartElement(element) {
    return !!(element
      && element.classList
      && typeof element.classList.contains === 'function'
      && element.classList.contains('editor-chart'));
  }

  function readStudioChartAttribute(element, name) {
    if (!element || typeof name !== 'string') return '';
    if (typeof element.getAttribute === 'function') {
      const value = element.getAttribute(name);
      if (typeof value === 'string' && value) return value;
    }
    const dataName = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (element.dataset && typeof element.dataset[dataName] === 'string') {
      return element.dataset[dataName];
    }
    if (element.attributes && typeof element.attributes[name] === 'string') {
      return element.attributes[name];
    }
    return '';
  }

  function writeStudioChartAttribute(element, name, value) {
    if (!element) return;
    if (typeof element.setAttribute === 'function') {
      element.setAttribute(name, value);
      return;
    }
    const dataName = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (element.dataset) element.dataset[dataName] = String(value);
    if (element.attributes) element.attributes[name] = String(value);
  }

  function parseStudioChartValues(value) {
    const parts = `${value ?? ''}`.split(',').map((part) => part.trim());
    if (parts.length === 0 || parts.length > MAX_CHART_VALUES || parts.some((part) => !part)) {
      return null;
    }
    const values = parts.map((part) => Number(part));
    if (values.some((number) => !Number.isFinite(number) || number < 0)) return null;
    return values;
  }

  function collectStudioChartBars(element, bars = []) {
    if (!element) return bars;
    if (element.children && typeof element.children.length === 'number') {
      Array.from(element.children).forEach((child) => {
        if (child.classList
          && typeof child.classList.contains === 'function'
          && child.classList.contains('editor-chart-bar')) {
          bars.push(child);
        }
        collectStudioChartBars(child, bars);
      });
    }
    return bars;
  }

  function getStudioChartBars(element) {
    if (element && typeof element.querySelectorAll === 'function') {
      return Array.from(element.querySelectorAll('.editor-chart-bar'));
    }
    return collectStudioChartBars(element);
  }

  function getStudioChartValues(element) {
    const values = parseStudioChartValues(readStudioChartAttribute(element, 'data-chart-values'));
    if (values) return values;
    const bars = getStudioChartBars(element);
    const fallbackValues = bars.map((bar) => {
      const rawValue = readStudioChartAttribute(bar, 'data-chart-value')
        || readStudioChartAttribute(bar, 'data-value');
      if (rawValue) return Number(rawValue);
      const height = bar && bar.style && typeof bar.style.height === 'string'
        ? bar.style.height
        : '';
      const match = height.match(/^\s*(\d+(?:\.\d+)?)%?\s*$/);
      return match ? Number(match[1]) : NaN;
    });
    return fallbackValues.length > 0 && fallbackValues.every(Number.isFinite)
      ? fallbackValues
      : [];
  }

  function createChartTransaction(chart, beforeValues, afterValues, beforeMarkup, afterMarkup, options) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    if (!transactionApi) return null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const datasetTransaction = typeof transactionApi.createStudioDatasetTransaction === 'function'
      ? transactionApi.createStudioDatasetTransaction([{
          element: chart,
          elementId: getElementId(chart),
          property: 'chartValues',
          before: beforeValues,
          after: afterValues
        }], { getElementId })
      : null;
    const markupTransaction = beforeMarkup !== afterMarkup
      && typeof transactionApi.createStudioMarkupTransaction === 'function'
      ? transactionApi.createStudioMarkupTransaction([{
          element: chart,
          elementId: getElementId(chart),
          before: beforeMarkup,
          after: afterMarkup
        }], { getElementId })
      : null;
    if (datasetTransaction && markupTransaction
      && typeof transactionApi.mergeStudioEditorTransactions === 'function') {
      return transactionApi.mergeStudioEditorTransactions(datasetTransaction, markupTransaction);
    }
    return datasetTransaction || markupTransaction || null;
  }

  function applyStudioChartValuesMutationWithTransaction(elements = [], value, options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const charts = selection.filter(isStudioChartElement);
    if (charts.length !== 1) {
      return { didApply: false, displayValue: `${value}`, transaction: null };
    }

    const chart = charts[0];
    const values = parseStudioChartValues(value);
    const bars = getStudioChartBars(chart);
    if (!values || bars.length !== values.length) {
      return { didApply: false, displayValue: `${value}`, transaction: null };
    }

    const beforeValues = readStudioChartAttribute(chart, 'data-chart-values');
    const beforeMarkup = typeof chart.innerHTML === 'string' ? chart.innerHTML : '';
    const maxValue = Math.max(...values);
    writeStudioChartAttribute(chart, 'data-chart-values', values.join(','));
    bars.forEach((bar, index) => {
      const height = maxValue > 0 ? (values[index] / maxValue) * 100 : 0;
      writeStudioChartAttribute(bar, 'data-chart-value', values[index]);
      if (bar.style) bar.style.height = `${height}%`;
    });
    const afterMarkup = typeof chart.innerHTML === 'string' ? chart.innerHTML : '';

    return {
      didApply: true,
      displayValue: values.join(','),
      transaction: createChartTransaction(
        chart,
        beforeValues,
        values.join(','),
        beforeMarkup,
        afterMarkup,
        options
      )
    };
  }

  return {
    MAX_CHART_VALUES,
    isStudioChartElement,
    parseStudioChartValues,
    getStudioChartValues,
    applyStudioChartValuesMutationWithTransaction
  };
});
