const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deleteController = require('../shared/studio-editor-version-delete-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version delete controller confirms, executes, and refreshes on success', async () => {
  const calls = [];
  await deleteController.deleteStudioVersion({
    filename: 'backup.html',
    confirmAction(message) {
      calls.push(['confirm', message]);
      return true;
    },
    createVersionActionContext() {
      calls.push(['context']);
      return { presentationUrl: '/presentations/demo/index.html' };
    },
    versionActionsApi: {
      createStudioDeleteVersionRequestExecutor(options) {
        return (filename, context) => {
          calls.push(['execute', filename, context, typeof options.createVersionRequestOptions]);
          return Promise.resolve({ success: true });
        };
      }
    },
    createVersionRequestOptions() {},
    applyListMutationSuccess(context, options) {
      calls.push(['success', context]);
      options.refreshVersionEntries(context.presentationUrl, 5);
    },
    refreshVersionEntries() {
      calls.push(['refresh']);
    },
    applyFailure() {
      calls.push(['failure']);
    }
  });

  assert.deepEqual(calls.map(([name]) => name), [
    'confirm', 'context', 'execute', 'success', 'refresh'
  ]);
  assert.equal(calls[2][3], 'function');
});

test('version delete controller reports failed responses and network errors', async () => {
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

  await deleteController.deleteStudioVersion({
    ...baseOptions,
    executeDeleteVersionRequest: async () => ({ success: false, error: 'missing' })
  });
  await deleteController.deleteStudioVersion({
    ...baseOptions,
    executeDeleteVersionRequest: async () => {
      throw new Error('offline');
    }
  });

  assert.deepEqual(calls.map(([name]) => name), ['failure', 'alert', 'failure', 'alert']);
  assert.equal(calls[1][1], 'Delete failed: missing');
  assert.equal(calls[3][1], 'Error deleting version: offline');
});

test('version delete controller skips execution when confirmation is declined', async () => {
  let executeCalls = 0;
  await deleteController.deleteStudioVersion({
    filename: 'backup.html',
    confirmAction: () => false,
    executeDeleteVersionRequest: async () => {
      executeCalls += 1;
    }
  });
  assert.equal(executeCalls, 0);
});

test('index routes delete-version orchestration through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-version-delete-controller\.js"/);
  assert.match(source, /versionDeleteController\.deleteStudioVersion/);
});
