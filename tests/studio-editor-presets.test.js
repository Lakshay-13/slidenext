const test = require('node:test');
const assert = require('node:assert/strict');

const presets = require('../shared/studio-editor-presets.js');

test('editor preset data preserves the existing wallpaper and theme collections', () => {
  assert.equal(presets.wallpaperPresetsData.solid.length, 12);
  assert.equal(presets.wallpaperPresetsData.gradient.length, 15);
  assert.equal(presets.wallpaperPresetsData.solid[0].value, '#050505');
  assert.equal(presets.wallpaperPresetsData.gradient.at(-1).name, 'Warm Sunset Aura');
  assert.deepEqual(Object.keys(presets.themeTokenPresetsData), ['aurora', 'paper']);
  assert.equal(presets.themeTokenPresetsData.aurora.name, 'Aurora Glass');
  assert.equal(presets.themeTokenPresetsData.paper.tokens['--color-primary'], '#0f766e');
});
