const test = require('node:test');
const assert = require('node:assert/strict');

const colorUtils = require('../shared/studio-color-utils.js');

test('rgbToHex preserves hex values and converts rgb colors', () => {
  assert.equal(colorUtils.rgbToHex('#112233'), '#112233');
  assert.equal(colorUtils.rgbToHex('rgb(17, 34, 51)'), '#112233');
  assert.equal(colorUtils.rgbToHex('rgba(68, 85, 102, 0.5)'), '#445566');
});

test('rgbToHex uses the white fallback for empty or unsupported values', () => {
  assert.equal(colorUtils.rgbToHex(''), '#ffffff');
  assert.equal(colorUtils.rgbToHex('transparent'), '#ffffff');
});
