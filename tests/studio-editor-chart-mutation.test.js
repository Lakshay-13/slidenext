const test = require('node:test');
const assert = require('node:assert/strict');

const chartMutation = require('../shared/studio-editor-chart-mutation.js');
const transaction = require('../shared/studio-editor-transaction.js');

function createClassList(classes = []) {
  const values = new Set(classes);
  return {
    contains(value) {
      return values.has(value);
    }
  };
}

function createChart(values = [42, 68, 55, 86]) {
  const bars = values.map((value) => ({
    dataset: {},
    style: { height: `${value}%` },
    classList: createClassList(['editor-chart-bar']),
    getAttribute(name) {
      return this.attributes && this.attributes[name] ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes = this.attributes || {};
      this.attributes[name] = String(value);
      if (name === 'data-chart-value') this.dataset.chartValue = String(value);
    }
  }));
  const chartBody = { children: bars, classList: createClassList(['editor-chart-bars']) };
  const title = {
    textContent: 'Quarterly trend',
    children: [],
    classList: createClassList(['editor-chart-title'])
  };
  const chart = {
    dataset: { editorId: 'chart-1', chartValues: values.join(',') },
    children: [title, chartBody],
    classList: createClassList(['editor-chart']),
    getAttribute(name) {
      return name === 'data-chart-values' ? this.dataset.chartValues : null;
    },
    setAttribute(name, value) {
      if (name === 'data-chart-values') this.dataset.chartValues = String(value);
    }
  };
  Object.defineProperty(chart, 'innerHTML', {
    configurable: true,
    get() {
      return `${title.textContent}|${bars.map((bar) => `${bar.dataset.chartValue || ''}:${bar.style.height}`).join('|')}`;
    },
    set(value) {
      this._innerHTML = value;
    }
  });
  return { chart, bars, title };
}

test('chart values mutation updates metadata, bar heights, and a reversible transaction', () => {
  const { chart, bars } = createChart();
  const result = chartMutation.applyStudioChartValuesMutationWithTransaction(
    [chart],
    '10, 20, 15, 30',
    {
      transactionApi: transaction,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(result.displayValue, '10,20,15,30');
  assert.equal(chart.dataset.chartValues, '10,20,15,30');
  assert.deepEqual(bars.map((bar) => bar.dataset.chartValue), ['10', '20', '15', '30']);
  assert.deepEqual(bars.map((bar) => bar.style.height), ['33.33333333333333%', '66.66666666666666%', '50%', '100%']);
  assert.deepEqual(result.transaction.operations.map((operation) => operation.type), ['dataset', 'markup']);
});

test('chart values mutation rejects malformed or mismatched input without changing the chart', () => {
  const { chart, bars } = createChart();
  const before = chart.dataset.chartValues;

  assert.equal(
    chartMutation.applyStudioChartValuesMutationWithTransaction([chart], '10, nope, 30').didApply,
    false
  );
  assert.equal(
    chartMutation.applyStudioChartValuesMutationWithTransaction([chart], '10,20').didApply,
    false
  );
  assert.equal(chart.dataset.chartValues, before);
  assert.deepEqual(bars.map((bar) => bar.style.height), ['42%', '68%', '55%', '86%']);
});

test('chart values reader falls back to bar metadata for legacy charts', () => {
  const { chart, bars } = createChart([12, 24]);
  delete chart.dataset.chartValues;
  bars[0].setAttribute('data-chart-value', '12');
  bars[1].setAttribute('data-chart-value', '24');

  assert.deepEqual(chartMutation.getStudioChartValues(chart), [12, 24]);
});

test('chart title mutation updates the existing title node and records markup history', () => {
  const { chart, title } = createChart();
  const result = chartMutation.applyStudioChartTitleMutationWithTransaction(
    [chart],
    '  Updated   trend  ',
    {
      transactionApi: transaction,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(result.displayValue, 'Updated trend');
  assert.equal(title.textContent, 'Updated trend');
  assert.deepEqual(result.transaction.operations.map((operation) => operation.type), ['markup']);
  assert.equal(chartMutation.getStudioChartTitle(chart), 'Updated trend');
});

test('chart title mutation rejects non-chart selections without changing the title', () => {
  const { chart, title } = createChart();
  const nonChart = { classList: createClassList() };

  assert.equal(
    chartMutation.applyStudioChartTitleMutationWithTransaction([nonChart], 'Other').didApply,
    false
  );
  assert.equal(title.textContent, 'Quarterly trend');
  assert.equal(chartMutation.getStudioChartTitle(chart), 'Quarterly trend');
});
