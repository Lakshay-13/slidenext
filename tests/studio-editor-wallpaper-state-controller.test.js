const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wallpaperStateController = require('../shared/studio-editor-wallpaper-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const WALLPAPER_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-wallpaper-state-accessors.js'
);

test('wallpaper state controller owns tab and gradient selections', () => {
  const controller = wallpaperStateController.createStudioEditorWallpaperStateController({
    initialWallpaperTab: 'custom',
    initialCustomGradientType: 'radial',
    initialPendingCustomWallpaperVersion: true
  });

  assert.equal(controller.getWallpaperTab(), 'custom');
  assert.equal(controller.getCustomGradientType(), 'radial');
  assert.equal(controller.getPendingCustomWallpaperVersion(), true);
  assert.equal(controller.setWallpaperTab('presets'), 'presets');
  assert.equal(controller.setCustomGradientType('linear'), 'linear');
  assert.equal(controller.setPendingCustomWallpaperVersion(false), false);
  assert.equal(controller.setPendingCustomWallpaperVersion(true), true);
  assert.equal(controller.clearPendingCustomWallpaperVersion(), false);
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
  assert.match(fileContent, /studio-editor-wallpaper-state-store\.js/);
  assert.match(fileContent, /studioEditorWallpaperStateStore/);
  assert.match(fileContent, /studioEditorWallpaperStateGlobalApi/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorWallpaperStateGlobalApi\)/);
  const wallpaperAccessors = fs.readFileSync(WALLPAPER_ACCESSORS_PATH, 'utf8');
  assert.match(wallpaperAccessors, /getStudioWallpaperTab: \(\) => accessors\.getWallpaperTab\(\)/);
  assert.match(
    wallpaperAccessors,
    /getStudioPendingCustomWallpaperVersion: \(\) => accessors\.getPendingCustomWallpaperVersion\(\)/
  );
  assert.match(fileContent, /getWallpaperTab: getStudioWallpaperTab/);
  assert.match(fileContent, /setStudioPendingCustomWallpaperVersion\(!!isCustomInput\)/);
  assert.match(fileContent, /clearStudioPendingCustomWallpaperVersion\(\)/);
  assert.doesNotMatch(fileContent, /const studioEditorWallpaperStateController =/);
  assert.doesNotMatch(fileContent, /let wallpaperTab = 'solid'/);
  assert.doesNotMatch(fileContent, /let customGradientType = 'linear'/);
  assert.doesNotMatch(fileContent, /wallpaperTab = tab/);
  assert.doesNotMatch(fileContent, /customGradientType = type/);
  assert.doesNotMatch(fileContent, /let hasPendingCustomWallpaperVersion = false/);
});
