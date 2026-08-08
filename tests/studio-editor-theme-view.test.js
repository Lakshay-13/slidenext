const test = require('node:test');
const assert = require('node:assert/strict');

const themeView = require('../shared/studio-editor-theme-view.js');

test('renderStudioThemeTokenPresets renders disabled-aware swatches and labels', () => {
  const container = { innerHTML: '' };
  assert.equal(themeView.renderStudioThemeTokenPresets({
    documentRef: {
      getElementById(id) {
        return id === 'themeTokenPresetsList' ? container : null;
      }
    },
    presetData: {
      aurora: {
        name: 'Aurora',
        tokens: {
          '--color-primary': '#5eead4',
          '--color-secondary': '#a78bfa',
          '--color-bg-base': '#07111f'
        }
      }
    },
    canUseThemeTokenControls: false
  }), true);

  assert.match(container.innerHTML, /data-theme-preset-id="aurora"/);
  assert.match(container.innerHTML, /Apply Aurora theme tokens/);
  assert.match(container.innerHTML, /Brand tokens/);
  assert.match(container.innerHTML, /disabled/);
  assert.match(container.innerHTML, /#5eead4/);
});

test('renderStudioThemeTokenPresets falls back to safe swatches and tolerates missing containers', () => {
  const container = { innerHTML: '' };
  assert.equal(themeView.renderStudioThemeTokenPresets({
    documentRef: {
      getElementById() {
        return container;
      }
    },
    presetData: {
      safe: { name: '<Unsafe>', tokens: { '--color-primary': 'url(javascript:bad)' } }
    },
    canUseThemeTokenControls: true
  }), true);
  assert.match(container.innerHTML, /background:#7028d0/);
  assert.doesNotMatch(container.innerHTML, /<Unsafe>/);
  assert.equal(themeView.renderStudioThemeTokenPresets({ documentRef: null }), false);
});

test('syncStudioThemeTokenPresetActionState toggles rendered preset buttons', () => {
  const buttons = [{ disabled: false }, { disabled: false }];
  assert.equal(themeView.syncStudioThemeTokenPresetActionState({
    documentRef: {
      getElementById(id) {
        return id === 'themeTokenPresetsList'
          ? { querySelectorAll: () => buttons }
          : null;
      }
    },
    canUseThemeTokenControls: false
  }), true);
  assert.deepEqual(buttons.map((button) => button.disabled), [true, true]);
});
