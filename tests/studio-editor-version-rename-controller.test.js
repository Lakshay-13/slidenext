const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renameController = require('../shared/studio-editor-version-rename-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version rename controller runs the guarded success lifecycle', async () => {
  const calls = [];
  await renameController.renameStudioVersion({
    versionFilename: 'backup.html',
    newLabel: 'Renamed',
    renameContext: { presentationUrl: '/presentations/demo/index.html' },
    isCurrentSession: () => true,
    versionActionsApi: {
      createStudioRenameVersionRequestExecutor(options) {
        return (filename, label, context) => {
          calls.push(['execute', filename, label, context, typeof options.createVersionRequestOptions]);
          return Promise.resolve({ success: true });
        };
      }
    },
    createVersionRequestOptions() {},
    setBusy() {
      calls.push(['busy']);
    },
    applyListMutationSuccess(context, options) {
      calls.push([options.refreshVersionEntries ? 'success' : 'success-finally', context]);
      options.onSuccess();
      if (options.refreshVersionEntries) {
        options.refreshVersionEntries(context.presentationUrl, 4);
      }
    },
    applyFailure() {
      calls.push(['failure']);
    },
    closeRenameVersionModal() {
      calls.push(['close']);
    },
    refreshVersionEntries() {
      calls.push(['refresh']);
    },
    setIdle() {
      calls.push(['idle']);
    }
  });

  assert.deepEqual(calls.map(([name]) => name), [
    'busy', 'execute', 'success', 'close', 'refresh', 'success-finally', 'idle'
  ]);
  assert.equal(calls[1][4], 'function');
});

test('version rename controller reports failures and always resets the button', async () => {
  const calls = [];
  const baseOptions = {
    versionFilename: 'backup.html',
    newLabel: 'Renamed',
    renameContext: { presentationUrl: '/presentations/demo/index.html' },
    setBusy() {
      calls.push(['busy']);
    },
    applyListMutationSuccess(context, options) {
      calls.push(['success-finally', context]);
      options.onSuccess();
    },
    applyFailure(context, options) {
      calls.push(['failure', context]);
      options.onFailure();
    },
    alertAction(message) {
      calls.push(['alert', message]);
    },
    setIdle() {
      calls.push(['idle']);
    }
  };

  await renameController.renameStudioVersion({
    ...baseOptions,
    executeRenameVersionRequest: async () => ({ success: false, error: 'duplicate label' })
  });
  await renameController.renameStudioVersion({
    ...baseOptions,
    executeRenameVersionRequest: async () => {
      throw new Error('offline');
    }
  });

  assert.deepEqual(calls.map(([name]) => name), [
    'busy', 'failure', 'alert', 'success-finally', 'idle',
    'busy', 'failure', 'alert', 'success-finally', 'idle'
  ]);
  assert.equal(calls[2][1], 'Rename failed: duplicate label');
  assert.equal(calls[7][1], 'Error renaming version: offline');
});

test('version rename controller skips invalid rename requests', async () => {
  let executeCalls = 0;
  await renameController.renameStudioVersion({
    versionFilename: '',
    newLabel: 'Renamed',
    renameContext: { presentationUrl: '/presentations/demo/index.html' },
    executeRenameVersionRequest: async () => {
      executeCalls += 1;
    }
  });
  assert.equal(executeCalls, 0);
});

test('index routes rename-version orchestration through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-version-rename-controller\.js"/);
  assert.match(source, /versionRenameController\.renameStudioVersion/);
});
