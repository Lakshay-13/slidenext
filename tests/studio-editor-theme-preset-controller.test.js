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
