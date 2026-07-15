const test = require('node:test');
const assert = require('node:assert/strict');

const themeView = require('../shared/studio-theme-view.js');

function createClassList(initial = false) {
  let hasDark = initial;
  return {
    toggle(className) {
      assert.equal(className, 'dark');
      hasDark = !hasDark;
      return hasDark;
    },
    contains(className) {
      return className === 'dark' && hasDark;
    }
  };
}

test('toggleStudioGlobalTheme persists mode, updates icons, and syncs the iframe', () => {
  const documentElement = { classList: createClassList(false) };
  const icons = {
    themeIcon: { textContent: '' },
    themeIconEditor: { textContent: '' }
  };
  const stored = [];
  let syncCalls = 0;
  const documentRef = {
    documentElement,
    getElementById(id) {
      return icons[id] || null;
    }
  };

  assert.deepEqual(themeView.toggleStudioGlobalTheme({
    documentRef,
    localStorageRef: {
      setItem(key, value) {
        stored.push([key, value]);
      }
    },
    syncIframeTheme() {
      syncCalls += 1;
    }
  }), { didApply: true, isDark: true, mode: 'dark' });
  assert.equal(documentElement.classList.contains('dark'), true);
  assert.equal(icons.themeIcon.textContent, 'light_mode');
  assert.equal(icons.themeIconEditor.textContent, 'light_mode');

  assert.deepEqual(themeView.toggleStudioGlobalTheme({ documentRef }), {
    didApply: true,
    isDark: false,
    mode: 'light'
  });
  assert.deepEqual(stored, [['theme', 'dark']]);
  assert.equal(syncCalls, 1);
  assert.equal(icons.themeIcon.textContent, 'dark_mode');
});
