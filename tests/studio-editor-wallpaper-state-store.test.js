const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const wallpaperStoreApi = require('../shared/studio-editor-wallpaper-state-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-wallpaper-state-store.js');

test('wallpaper state store delegates tab, gradient, and pending-version state', () => {
  let wallpaperTab = 'custom';
  let customGradientType = 'radial';
  let pendingVersion = true;
  const store = wallpaperStoreApi.createStudioEditorWallpaperStateStore({
    stateController: {
      getWallpaperTab: () => wallpaperTab,
      setWallpaperTab: (value) => {
        wallpaperTab = value;
        return wallpaperTab;
      },
      getCustomGradientType: () => customGradientType,
      setCustomGradientType: (value) => {
        customGradientType = value;
        return customGradientType;
      },
      getPendingCustomWallpaperVersion: () => pendingVersion,
      setPendingCustomWallpaperVersion: (value) => {
        pendingVersion = !!value;
        return pendingVersion;
      },
      clearPendingCustomWallpaperVersion: () => {
        pendingVersion = false;
        return pendingVersion;
      },
      reset: () => {
        wallpaperTab = 'solid';
        customGradientType = 'linear';
        pendingVersion = false;
        return { wallpaperTab, customGradientType };
      }
    }
  });

  assert.equal(store.getWallpaperTab(), 'custom');
  assert.equal(store.getCustomGradientType(), 'radial');
  assert.equal(store.getPendingCustomWallpaperVersion(), true);
  assert.equal(store.setWallpaperTab('presets'), 'presets');
  assert.equal(store.setCustomGradientType('linear'), 'linear');
  assert.equal(store.setPendingCustomWallpaperVersion(false), false);
  assert.deepEqual(store.reset(), { wallpaperTab: 'solid', customGradientType: 'linear' });
});

test('wallpaper state store keeps safe fallbacks when the controller is unavailable', () => {
  const store = wallpaperStoreApi.createStudioEditorWallpaperStateStore({});

  assert.equal(store.getWallpaperTab(), 'solid');
  assert.equal(store.getCustomGradientType(), 'linear');
  assert.equal(store.getPendingCustomWallpaperVersion(), false);
  assert.equal(store.setWallpaperTab('custom'), false);
  assert.equal(store.setCustomGradientType('radial'), false);
  assert.equal(store.setPendingCustomWallpaperVersion(true), false);
  assert.equal(store.clearPendingCustomWallpaperVersion(), false);
  assert.equal(store.reset(), false);
});

test('wallpaper state store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorWallpaperStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorWallpaperStateStore
      .createStudioEditorWallpaperStateStore,
    'function'
  );
});

test('editor routes wallpaper state through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-wallpaper-state-store\.js/);
  assert.match(source, /studioEditorWallpaperStateStore/);
  assert.doesNotMatch(source, /const studioEditorWallpaperStateController =/);
});
