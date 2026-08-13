const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gradientActions = require('../shared/studio-editor-wallpaper-gradient-actions.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('gradient actions build and apply linear and radial wallpaper values', () => {
  let currentType = 'linear';
  const applied = [];
  const elements = {
    cgLinearBtn: { className: '' },
    cgRadialBtn: { className: '' },
    cgAngleGroup: { classList: { add() {}, remove() {} } },
    cgColor1: { value: '#111111' },
    cgColor2: { value: '#eeeeee' },
    cgAngle: { value: '45' }
  };
  const actions = gradientActions.createStudioEditorWallpaperGradientActions({
    resolveActionState: () => ({ canUseWallpaperControls: true }),
    getDocument: () => ({ getElementById: (id) => elements[id] || null }),
    getCustomGradientType: () => currentType,
    setCustomGradientType: (nextType) => {
      currentType = nextType;
      return nextType;
    },
    applyPresetWallpaper: (...args) => {
      applied.push(args);
      return true;
    }
  });

  assert.equal(actions.applyCustomGradient(), true);
  assert.deepEqual(applied.at(-1), [
    'linear-gradient(45deg, #111111 0%, #eeeeee 100%)',
    true
  ]);
  assert.equal(actions.setCustomGradientType('radial'), true);
  assert.deepEqual(applied.at(-1), [
    'radial-gradient(circle, #111111 0%, #eeeeee 100%)',
    true
  ]);
});

test('gradient actions fail closed when wallpaper controls are unavailable', () => {
  let documentLookups = 0;
  const actions = gradientActions.createStudioEditorWallpaperGradientActions({
    resolveActionState: () => ({ canUseWallpaperControls: false }),
    getDocument: () => ({
      getElementById() {
        documentLookups += 1;
        return null;
      }
    })
  });

  assert.equal(actions.applyCustomGradient(), false);
  assert.equal(actions.setCustomGradientType('radial'), false);
  assert.equal(actions.updateCustomGradientAngle('180'), false);
  assert.equal(documentLookups, 0);
});

test('gradient actions delegate chrome synchronization to the wallpaper view', () => {
  const syncCalls = [];
  const documentRef = {
    id: 'editor-document',
    getElementById() {
      return { className: '', classList: { add() {}, remove() {} } };
    }
  };
  const actions = gradientActions.createStudioEditorWallpaperGradientActions({
    resolveActionState: () => ({ canUseWallpaperControls: true }),
    getDocument: () => documentRef,
    getWallpaperView: () => ({
      syncStudioCustomGradientTypeChrome(options) {
        syncCalls.push(['type', options]);
        return true;
      },
      syncStudioCustomGradientAngleChrome(options) {
        syncCalls.push(['angle', options]);
      }
    }),
    applyCustomGradient: () => true
  });

  assert.equal(actions.setCustomGradientType('radial'), true);
  assert.equal(actions.updateCustomGradientAngle('210'), true);
  assert.deepEqual(syncCalls, [
    ['type', { documentRef, gradientType: 'radial' }],
    ['angle', { documentRef, angle: '210' }]
  ]);
});

test('gradient global API preserves the three editor handler names', () => {
  const calls = [];
  const api = gradientActions.createStudioEditorWallpaperGradientGlobalApi({
    actions: {
      applyCustomGradient: () => {
        calls.push(['apply']);
        return 'applied';
      },
      setCustomGradientType: (value) => {
        calls.push(['type', value]);
        return value;
      },
      updateCustomGradientAngle: (value) => {
        calls.push(['angle', value]);
        return value;
      }
    }
  });

  assert.equal(api.applyCustomGradient(), 'applied');
  assert.equal(api.setCustomGradientType('linear'), 'linear');
  assert.equal(api.updateCustomGradientAngle('90'), '90');
  assert.deepEqual(calls, [['apply'], ['type', 'linear'], ['angle', '90']]);
});

test('index loads the gradient action module and installs its global API', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-wallpaper-gradient-actions\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorWallpaperGradientGlobalApi\);/);
  assert.match(fileContent, /applyPresetWallpaper: \(\.\.\.args\) => applyPresetWallpaper\(\.\.\.args\)/);
});
