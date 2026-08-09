const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wallpaperStateController = require('../shared/studio-editor-wallpaper-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('wallpaper state controller owns tab and gradient selections', () => {
  const controller = wallpaperStateController.createStudioEditorWallpaperStateController({
    initialWallpaperTab: 'custom',
    initialCustomGradientType: 'radial'
  });

  assert.equal(controller.getWallpaperTab(), 'custom');
  assert.equal(controller.getCustomGradientType(), 'radial');
  assert.equal(controller.setWallpaperTab('presets'), 'presets');
  assert.equal(controller.setCustomGradientType('linear'), 'linear');
  assert.deepEqual(controller.reset(), {
    wallpaperTab: 'solid',
    customGradientType: 'linear'
  });
});

test('editor wiring routes wallpaper state through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-wallpaper-state-controller\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorWallpaperStateController\(\)/);
  assert.match(fileContent, /getWallpaperTab: getStudioWallpaperTab/);
  assert.doesNotMatch(fileContent, /let wallpaperTab = 'solid'/);
  assert.doesNotMatch(fileContent, /let customGradientType = 'linear'/);
  assert.doesNotMatch(fileContent, /wallpaperTab = tab/);
  assert.doesNotMatch(fileContent, /customGradientType = type/);
});
