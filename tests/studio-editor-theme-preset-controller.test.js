const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../shared/studio-editor-theme-preset-controller.js');

test('theme preset controller rolls back CSS tokens when canonical finalization throws', () => {
  const calls = [];
  const documentRef = {
    documentElement: {
      style: {
        getPropertyValue(name) {
          assert.equal(name, '--color-primary');
          return '#111111';
        }
      }
    }
  };
  const canonicalDeck = { slides: [] };
  const controllerResult = controller.applyStudioThemeTokenPreset({
    presetData: {
      dusk: {
        name: 'Dusk',
        tokens: { '--color-primary': '#ffffff' }
      }
    },
    presetId: 'dusk',
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getIframeDocument: () => documentRef,
    canonicalThemeApi: {
      buildStudioCanonicalThemeBaseline: () => ({ slides: [] }),
      buildStudioCanonicalThemeDeck: () => canonicalDeck,
      applyStudioCanonicalThemeTokenUpdates(_document, tokens) {
        calls.push(tokens);
        return true;
      }
    },
    canonicalDeckApi: {},
    finalizeMutation: () => {
      throw new Error('theme finalization failed');
    },
    updateActionState: () => calls.push('actions')
  });

  assert.equal(controllerResult, false);
  assert.deepEqual(calls, [
    { '--color-primary': '#ffffff' },
    { '--color-primary': '#111111' }
  ]);
});

test('theme preset controller fails closed when readiness, iframe, or token application throws', () => {
  const baseOptions = {
    presetData: { dusk: { name: 'Dusk', tokens: { '--color-primary': '#ffffff' } } },
    presetId: 'dusk'
  };

  assert.equal(controller.applyStudioThemeTokenPreset({
    ...baseOptions,
    resolveReadyState() {
      throw new Error('ready state unavailable');
    }
  }), false);

  assert.equal(controller.applyStudioThemeTokenPreset({
    ...baseOptions,
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getIframeDocument() {
      throw new Error('iframe unavailable');
    }
  }), false);

  assert.equal(controller.applyStudioThemeTokenPreset({
    ...baseOptions,
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getIframeDocument: () => ({ documentElement: { style: {} } }),
    canonicalThemeApi: {
      buildStudioCanonicalThemeBaseline: () => ({ slides: [] }),
      buildStudioCanonicalThemeDeck: () => ({ slides: [] }),
      applyStudioCanonicalThemeTokenUpdates() {
        throw new Error('token write failed');
      }
    },
    canonicalDeckApi: {}
  }), false);
});

test('theme preset controller preserves a committed mutation when action refresh throws', () => {
  assert.equal(controller.applyStudioThemeTokenPreset({
    presetData: { dusk: { name: 'Dusk', tokens: { '--color-primary': '#ffffff' } } },
    presetId: 'dusk',
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getIframeDocument: () => ({ documentElement: { style: {} } }),
    canonicalThemeApi: {
      buildStudioCanonicalThemeBaseline: () => ({ slides: [] }),
      buildStudioCanonicalThemeDeck: () => ({ slides: [] }),
      applyStudioCanonicalThemeTokenUpdates: () => true
    },
    canonicalDeckApi: {},
    finalizeMutation: () => true,
    updateActionState() {
      throw new Error('toolbar refresh failed');
    }
  }), true);
});
