const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const restoreController = require('../shared/studio-editor-version-restore-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version restore controller confirms, executes, and relaunches on success', async () => {
  const calls = [];
  await restoreController.restoreStudioVersion({
    filename: 'index_backup.html',
    confirmAction(message) {
      calls.push(['confirm', message]);
      return true;
    },
    createVersionActionContext() {
      calls.push(['context']);
      return { presentationUrl: '/presentations/demo/index.html' };
    },
    versionActionsApi: {
      createStudioRestoreVersionRequestExecutor(options) {
        return (filename, context) => {
          calls.push(['execute', filename, context, typeof options.createVersionRequestOptions]);
          return Promise.resolve({ success: true });
        };
      }
    },
    createVersionRequestOptions() {},
    applyRestoreSuccess(context, options) {
      calls.push(['success', context]);
      options.onSuccess();
      options.hideVersionsDropdown();
      options.relaunchEditor('/presentations/demo/index.html', 'Demo', 'General');
    },
    applyFailure() {
      calls.push(['failure']);
    },
    hideVersionsDropdown() {
      calls.push(['hide']);
    },
    relaunchEditor(url, title, category) {
      calls.push(['relaunch', url, title, category]);
    },
    alertAction(message) {
      calls.push(['alert', message]);
    }
  });

  assert.deepEqual(calls.map(([name]) => name), [
    'confirm', 'context', 'execute', 'success', 'alert', 'hide', 'relaunch'
  ]);
  assert.match(calls[0][1], /index_backup\.html/);
  assert.equal(calls[2][3], 'function');
  assert.deepEqual(calls[6], [
    'relaunch', '/presentations/demo/index.html', 'Demo', 'General'
  ]);
});

test('version restore controller reports failed responses and network errors', async () => {
  const calls = [];
  const baseOptions = {
    filename: 'backup.html',
    confirmAction: () => true,
    createVersionActionContext: () => ({ presentationUrl: '/presentations/demo/index.html' }),
    applyFailure(context, options) {
      calls.push(['failure', context]);
      options.onFailure();
    },
    alertAction(message) {
      calls.push(['alert', message]);
    }
  };

  await restoreController.restoreStudioVersion({
    ...baseOptions,
    executeRestoreVersionRequest: async () => ({ success: false, error: 'not found' })
  });
  await restoreController.restoreStudioVersion({
    ...baseOptions,
    executeRestoreVersionRequest: async () => {
      throw new Error('offline');
    }
  });

  assert.deepEqual(calls.map(([name]) => name), ['failure', 'alert', 'failure', 'alert']);
  assert.equal(calls[1][1], 'Restore failed: not found');
  assert.equal(calls[3][1], 'Network error restoring version: offline');
});

test('version restore controller skips execution when confirmation is declined', async () => {
  let executeCalls = 0;
  await restoreController.restoreStudioVersion({
    filename: 'backup.html',
    confirmAction: () => false,
    executeRestoreVersionRequest: async () => {
      executeCalls += 1;
    }
  });
  assert.equal(executeCalls, 0);
});

test('index routes restore-version orchestration through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-version-restore-controller\.js"/);
  assert.match(source, /versionRestoreController\.restoreStudioVersion/);
});
