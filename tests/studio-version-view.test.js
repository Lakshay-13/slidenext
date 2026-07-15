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

test('renderStudioVersionsList renders version labels, timestamps, and actions', () => {
  const list = { innerHTML: '' };
  assert.equal(versionView.renderStudioVersionsList({
    documentRef: {
      getElementById(id) {
        return id === 'versionsList' ? list : null;
      }
    },
    baseName: 'deck',
    versions: [{
      filename: 'index_20260101_120000_Auto.html',
      createdAt: '2026-01-01T12:00:00.000Z'
    }],
    deriveVersionDisplayLabel(filename, baseName) {
      assert.equal(baseName, 'deck');
      return `Readable ${filename}`;
    }
  }), true);
  assert.match(list.innerHTML, /Readable index_20260101_120000_Auto\.html/);
  assert.match(list.innerHTML, /restoreVersion\('index_20260101_120000_Auto\.html'\)/);
  assert.match(list.innerHTML, /promptRenameVersion/);
  assert.match(list.innerHTML, /deleteVersion/);
});

test('renderStudioVersionsList renders the empty state and tolerates missing chrome', () => {
  const list = { innerHTML: '' };
  assert.equal(versionView.renderStudioVersionsList({
    documentRef: {
      getElementById() {
        return list;
      }
    }
  }), true);
  assert.match(list.innerHTML, /No versions saved yet/);
  assert.equal(versionView.renderStudioVersionsList(), false);
});
