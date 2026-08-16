const test = require('node:test');
const assert = require('node:assert/strict');

const versionView = require('../shared/studio-version-view.js');

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
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

test('version view delegates modal chrome through the shared visibility controller', () => {
  const calls = [];
  const modalVisibility = {
    createStudioModalChromeController(options) {
      calls.push(['create', options.modalVisibility === modalVisibility]);
      return {
        show(...args) {
          calls.push(['show', ...args]);
          return 'shown';
        },
        hide(...args) {
          calls.push(['hide', ...args]);
          return 'hidden';
        },
        hideImmediately(...args) {
          calls.push(['hideImmediately', ...args]);
          return 'hidden-immediately';
        }
      };
    }
  };
  const modal = {};
  const content = {};
  const options = { delayMs: 10, modalVisibility };

  assert.equal(versionView.showStudioVersionModal(modal, content, options), 'shown');
  assert.equal(versionView.hideStudioVersionModal(modal, content, options), 'hidden');
  assert.equal(versionView.hideStudioVersionModalImmediately(modal, content, options), 'hidden-immediately');
  assert.deepEqual(calls, [
    ['create', true],
    ['show', modal, content, { delayMs: 10 }],
    ['create', true],
    ['hide', modal, content],
    ['create', true],
    ['hideImmediately', modal, content]
  ]);
});

test('version view opens and closes the save checkpoint modal with delayed focus', () => {
  const elements = {
    saveVersionModal: {
      classList: createClassList(['hidden', 'opacity-0']),
      offsetHeight: 0
    },
    saveVersionModalContent: {
      classList: createClassList(['scale-95'])
    },
    versionCheckpointName: {
      value: 'Existing label',
      focusCalls: 0,
      focus() {
        this.focusCalls += 1;
      }
    }
  };
  const callbacks = [];
  const modalVisibility = {
    cancelStudioModalHide() {},
    scheduleStudioModalCallback(modal, options) {
      callbacks.push([modal, options.delayMs]);
      options.callback();
    },
    scheduleStudioModalHide(modal, options) {
      options.onHide();
    }
  };
  const documentRef = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  assert.equal(versionView.openStudioSaveVersionModal({
    documentRef,
    canOpen: () => true,
    modalVisibility
  }), true);
  assert.equal(elements.versionCheckpointName.value, '');
  assert.equal(elements.versionCheckpointName.focusCalls, 1);
  assert.deepEqual(callbacks, [[elements.saveVersionModal, 50]]);
  assert.equal(elements.saveVersionModal.classList.contains('hidden'), false);

  assert.equal(versionView.closeStudioSaveVersionModal({
    documentRef,
    modalVisibility
  }), undefined);
  assert.equal(elements.saveVersionModal.classList.contains('hidden'), true);
});

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

test('version view binds the version toolbar controls', () => {
  const controls = {
    studioVersionBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    },
    studioSaveBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    }
  };
  const calls = [];

  assert.deepEqual(
    versionView.bindStudioEditorVersionToolbarControls({
      documentRef: {
        getElementById(id) {
          return controls[id] || null;
        }
      },
      toggleVersionDropdown() {
        calls.push('toggle-versions');
      },
      openSaveVersionModal() {
        calls.push('open-save-version');
      }
    }),
    { studioVersionBtn: true, studioSaveBtn: true }
  );
  controls.studioVersionBtn.listeners.click();
  controls.studioSaveBtn.listeners.click();
  assert.deepEqual(calls, ['toggle-versions', 'open-save-version']);
});

test('version view binds save-version modal controls and only submits on Enter', () => {
  const controls = {
    versionCheckpointName: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    },
    cancelSaveVersionBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    },
    confirmSaveVersionBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    }
  };
  const calls = [];

  assert.deepEqual(
    versionView.bindStudioEditorSaveVersionModalControls({
      documentRef: {
        getElementById(id) {
          return controls[id] || null;
        }
      },
      submitSaveVersion() {
        calls.push('submit');
      },
      closeSaveVersionModal() {
        calls.push('close');
      }
    }),
    {
      versionCheckpointName: true,
      cancelSaveVersionBtn: true,
      confirmSaveVersionBtn: true
    }
  );
  controls.versionCheckpointName.listeners.keydown({ key: 'Tab' });
  assert.deepEqual(calls, []);
  controls.versionCheckpointName.listeners.keydown({ key: 'Enter' });
  controls.cancelSaveVersionBtn.listeners.click();
  controls.confirmSaveVersionBtn.listeners.click();
  assert.deepEqual(calls, ['submit', 'close', 'submit']);
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
