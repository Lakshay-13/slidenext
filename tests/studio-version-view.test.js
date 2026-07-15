const test = require('node:test');
const assert = require('node:assert/strict');

const versionView = require('../shared/studio-version-view.js');

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('hideStudioVersionsDropdown hides the version menu', () => {
  const dropdown = { classList: createClassList() };
  assert.equal(versionView.hideStudioVersionsDropdown({
    documentRef: {
      getElementById(id) {
        return id === 'versionsDropdown' ? dropdown : null;
      }
    }
  }), true);
  assert.equal(dropdown.classList.contains('hidden'), true);
});

test('version rename button view helpers render reset and busy states', () => {
  const button = { disabled: true, textContent: 'Renaming...' };
  assert.equal(versionView.resetStudioRenameVersionButton(button), true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Rename');

  assert.equal(versionView.setStudioRenameVersionButtonBusy(button), true);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Renaming...');
});

test('version view helpers safely skip missing chrome', () => {
  assert.equal(versionView.hideStudioVersionsDropdown(), false);
  assert.equal(versionView.resetStudioRenameVersionButton(), false);
  assert.equal(versionView.setStudioRenameVersionButtonBusy(), false);
});
