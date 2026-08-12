const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-wallpaper-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-wallpaper-state-accessors.js');

test('wallpaper state accessors delegate tabs, gradients, and pending versions', () => {
  const bridge = {
    getWallpaperTab: () => 'gradient',
    setWallpaperTab: (value) => value,
    setCustomGradientType: (value) => value,
    getCustomGradientType: () => 'radial',
    reset: () => true,
    getPendingCustomWallpaperVersion: () => true,
    setPendingCustomWallpaperVersion: (value) => value,
    clearPendingCustomWallpaperVersion: () => true
  };
  const accessors = accessorsApi.createStudioEditorWallpaperStateAccessors({ bridge });

  assert.equal(accessors.getWallpaperTab(), 'gradient');
  assert.equal(accessors.setWallpaperTab('solid'), 'solid');
  assert.equal(accessors.setCustomGradientType('linear'), 'linear');
  assert.equal(accessors.getCustomGradientType(), 'radial');
  assert.equal(accessors.reset(), true);
  assert.equal(accessors.getPendingCustomWallpaperVersion(), true);
  assert.equal(accessors.setPendingCustomWallpaperVersion(false), false);
  assert.equal(accessors.clearPendingCustomWallpaperVersion(), true);
});

test('wallpaper state accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorWallpaperStateAccessors();

  assert.equal(accessors.getWallpaperTab(), 'solid');
  assert.equal(accessors.setWallpaperTab('gradient'), false);
  assert.equal(accessors.setCustomGradientType('radial'), false);
  assert.equal(accessors.getCustomGradientType(), 'linear');
  assert.equal(accessors.reset(), false);
  assert.equal(accessors.getPendingCustomWallpaperVersion(), false);
  assert.equal(accessors.setPendingCustomWallpaperVersion(true), false);
  assert.equal(accessors.clearPendingCustomWallpaperVersion(), false);
});

test('wallpaper global api preserves the editor shell function names', () => {
  const accessors = {
    getWallpaperTab: () => 'gradient',
    setWallpaperTab: (value) => value,
    setCustomGradientType: (value) => value,
    getCustomGradientType: () => 'radial',
    reset: () => true,
    getPendingCustomWallpaperVersion: () => true,
    setPendingCustomWallpaperVersion: (value) => value,
    clearPendingCustomWallpaperVersion: () => true
  };
  const globalApi = accessorsApi.createStudioEditorWallpaperStateGlobalApi({ accessors });

  assert.equal(globalApi.getStudioWallpaperTab(), 'gradient');
  assert.equal(globalApi.setStudioWallpaperTab('solid'), 'solid');
  assert.equal(globalApi.setStudioCustomGradientType('linear'), 'linear');
  assert.equal(globalApi.getStudioCustomGradientType(), 'radial');
  assert.equal(globalApi.resetStudioWallpaperState(), true);
  assert.equal(globalApi.getStudioPendingCustomWallpaperVersion(), true);
  assert.equal(globalApi.setStudioPendingCustomWallpaperVersion(false), false);
  assert.equal(globalApi.clearStudioPendingCustomWallpaperVersion(), true);
});

test('wallpaper state accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorWallpaperStateAccessors,
    'object'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorWallpaperStateAccessors
      .createStudioEditorWallpaperStateAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorWallpaperStateAccessors
      .createStudioEditorWallpaperStateGlobalApi,
    'function'
  );
});

test('editor loads wallpaper accessors after the wallpaper state bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-wallpaper-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.wallpaperStateAccessors/);
  assert.match(fileContent, /studioEditorWallpaperStateAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorWallpaperStateGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioWallpaperTab\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioPendingCustomWallpaperVersion\(\)/);
});
