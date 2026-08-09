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
    },
    toggle(value) {
      if (values.has(value)) {
        values.delete(value);
        return false;
      }
      values.add(value);
      return true;
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

test('toggleStudioVersionsDropdown reports whether the menu opened', () => {
  const dropdown = { classList: createClassList() };
  dropdown.classList.add('hidden');
  const documentRef = {
    getElementById(id) {
      return id === 'versionsDropdown' ? dropdown : null;
    }
  };

  assert.deepEqual(versionView.toggleStudioVersionsDropdown({ documentRef }), {
    didToggle: true,
    shouldOpen: true
  });
  assert.equal(dropdown.classList.contains('hidden'), false);

  assert.deepEqual(versionView.toggleStudioVersionsDropdown({ documentRef }), {
    didToggle: true,
    shouldOpen: false
  });
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

test('version view renders a retryable history load error', () => {
  const list = { innerHTML: '' };
  assert.equal(versionView.setStudioVersionHistoryErrorState({
    documentRef: {
      getElementById(id) {
        return id === 'versionsList' ? list : null;
      }
    }
  }), true);
  assert.match(list.innerHTML, /Failed to load version history/);
  assert.match(list.innerHTML, /Try again/);
  assert.match(list.innerHTML, /onclick="loadVersions\(\)"/);
});

test('version view renders a live loading state', () => {
  const list = { innerHTML: '' };
  assert.equal(versionView.setStudioVersionHistoryLoadingState({
    documentRef: {
      getElementById(id) {
        return id === 'versionsList' ? list : null;
      }
    }
  }), true);
  assert.match(list.innerHTML, /Loading versions/);
  assert.match(list.innerHTML, /role="status"/);
});

test('version view helpers safely skip missing chrome', () => {
  assert.equal(versionView.hideStudioVersionsDropdown(), false);
  assert.deepEqual(versionView.toggleStudioVersionsDropdown(), {
    didToggle: false,
    shouldOpen: false
  });
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

test('syncStudioVersionsList derives the deck base name before rendering versions', () => {
  const list = { innerHTML: '' };
  assert.equal(versionView.syncStudioVersionsList({
    documentRef: {
      getElementById(id) {
        return id === 'versionsList' ? list : null;
      }
    },
    presentationUrl: '/presentations/demo/index.html',
    deriveVersionDeckBaseName(url) {
      assert.equal(url, '/presentations/demo/index.html');
      return 'demo';
    },
    versions: [{
      filename: 'index_20260101_120000_Auto.html',
      createdAt: '2026-01-01T12:00:00.000Z'
    }],
    deriveVersionDisplayLabel(filename, baseName) {
      return `${baseName}:${filename}`;
    }
  }), true);
  assert.match(list.innerHTML, /demo:index_20260101_120000_Auto\.html/);
});
