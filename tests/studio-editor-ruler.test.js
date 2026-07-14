const test = require('node:test');
const assert = require('node:assert/strict');

const ruler = require('../shared/studio-editor-ruler.js');

test('buildStudioRulerTicks creates labeled major and unlabeled minor ticks', () => {
  assert.deepEqual(ruler.buildStudioRulerTicks(250, {
    majorStepPx: 100,
    minorStepPx: 25
  }), [
    { position: 0, isMajor: true, label: '0' },
    { position: 25, isMajor: false, label: '' },
    { position: 50, isMajor: false, label: '' },
    { position: 75, isMajor: false, label: '' },
    { position: 100, isMajor: true, label: '100' },
    { position: 125, isMajor: false, label: '' },
    { position: 150, isMajor: false, label: '' },
    { position: 175, isMajor: false, label: '' },
    { position: 200, isMajor: true, label: '200' },
    { position: 225, isMajor: false, label: '' },
    { position: 250, isMajor: false, label: '' }
  ]);
});

test('buildStudioRulerTicks includes a final partial-length tick and normalizes invalid steps', () => {
  assert.deepEqual(ruler.buildStudioRulerTicks(235, {
    majorStepPx: 0,
    minorStepPx: 0
  }).at(-1), {
    position: 235,
    isMajor: false,
    label: ''
  });

  assert.deepEqual(ruler.buildStudioRulerTicks(0), []);
});

test('buildStudioRulerRenderState maps logical ticks through zoom and visible offset', () => {
  assert.deepEqual(ruler.buildStudioRulerRenderState(100, -12, 0.5, {
    majorStepPx: 50,
    minorStepPx: 50
  }), [
    { position: 0, isMajor: true, label: '0', screenPosition: -12 },
    { position: 50, isMajor: true, label: '50', screenPosition: 13 },
    { position: 100, isMajor: true, label: '100', screenPosition: 38 }
  ]);
});
