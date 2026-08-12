const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeApi = require('../shared/studio-editor-wallpaper-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const BRIDGE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-wallpaper-state-bridge.js'
);

test('wallpaper state bridge delegates the complete state contract', () => {
  const calls = [];
  const bridge = bridgeApi.createStudioEditorWallpaperStateBridge({
    stateStore: {
      getWallpaperTab: () => 'custom',
      setWallpaperTab: (value) => {
        calls.push(['setWallpaperTab', value]);
        return value;
      },
      getCustomGradientType: () => 'radial',
      setCustomGradientType: (value) => {
        calls.push(['setCustomGradientType', value]);
        return value;
      },
      getPendingCustomWallpaperVersion: () => true,
      setPendingCustomWallpaperVersion: (value) => {
        calls.push(['setPendingCustomWallpaperVersion', value]);
        return value;
      },
      clearPendingCustomWallpaperVersion: () => {
        calls.push(['clearPendingCustomWallpaperVersion']);
        return false;
      },
      reset: () => {
        calls.push(['reset']);
        return { wallpaperTab: 'solid', customGradientType: 'linear' };
      }
    }
  });

  assert.equal(bridge.getWallpaperTab(), 'custom');
  assert.equal(bridge.setWallpaperTab('presets'), 'presets');
  assert.equal(bridge.getCustomGradientType(), 'radial');
  assert.equal(bridge.setCustomGradientType('linear'), 'linear');
  assert.equal(bridge.getPendingCustomWallpaperVersion(), true);
  assert.equal(bridge.setPendingCustomWallpaperVersion(false), false);
  assert.equal(bridge.clearPendingCustomWallpaperVersion(), false);
  assert.deepEqual(bridge.reset(), { wallpaperTab: 'solid', customGradientType: 'linear' });
  assert.deepEqual(calls, [
    ['setWallpaperTab', 'presets'],
    ['setCustomGradientType', 'linear'],
    ['setPendingCustomWallpaperVersion', false],
    ['clearPendingCustomWallpaperVersion'],
    ['reset']
  ]);
});

test('wallpaper state bridge keeps safe defaults without a store', () => {
  const bridge = bridgeApi.createStudioEditorWallpaperStateBridge({ stateStore: null });

  assert.equal(bridge.getWallpaperTab(), 'solid');
  assert.equal(bridge.getCustomGradientType(), 'linear');
  assert.equal(bridge.getPendingCustomWallpaperVersion(), false);
  assert.equal(bridge.setWallpaperTab('custom'), false);
  assert.equal(bridge.setCustomGradientType('radial'), false);
  assert.equal(bridge.setPendingCustomWallpaperVersion(true), false);
  assert.equal(bridge.clearPendingCustomWallpaperVersion(), false);
  assert.equal(bridge.reset(), false);
});

test('editor loads and composes wallpaper state through the bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-wallpaper-state-bridge\.js"><\/script>/);
  assert.match(fileContent, /studioEditorWallpaperStateBridge/);
  assert.match(fileContent, /studioEditorShellStateRuntime\.wallpaperStateBridge/);
  assert.doesNotMatch(
    fileContent,
    /studioEditorWallpaperStateStore\s*\n\s*&&\s*typeof studioEditorWallpaperStateStore\.getWallpaperTab/
  );
});

test('wallpaper state bridge publishes its browser global', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(BRIDGE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorWallpaperStateBridge, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorWallpaperStateBridge
      .createStudioEditorWallpaperStateBridge,
    'function'
  );
});
