const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const versionHistoryController = require('../shared/studio-editor-version-history-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version history controller delegates loader construction with live session readers', async () => {
  let loaderOptions = null;
  const createLoadOptions = () => ({ sessionToken: 18 });
  const controller = versionHistoryController.createStudioEditorVersionHistoryController({
    versionHistoryApi: {
      createStudioVersionHistoryLoader(options) {
        loaderOptions = options;
        return async (presentationUrl, sessionToken) => ({ presentationUrl, sessionToken });
      }
    },
    getPresentationUrl: () => '/presentations/demo/index.html',
    getSessionToken: () => 18,
    createLoadOptions,
    loadVersionHistory: () => []
  });

  assert.deepEqual(
    await controller.load('/presentations/demo/index.html', 19),
    { presentationUrl: '/presentations/demo/index.html', sessionToken: 19 }
  );
  assert.equal(loaderOptions.getPresentationUrl(), '/presentations/demo/index.html');
  assert.equal(loaderOptions.getSessionToken(), 18);
  assert.equal(loaderOptions.createLoadOptions, createLoadOptions);
  assert.equal(loaderOptions.loadVersionHistory instanceof Function, true);
});

test('version history controller preserves loading and error handling without the shared loader factory', async () => {
  const calls = [];
  const controller = versionHistoryController.createStudioEditorVersionHistoryController({
    versionHistoryApi: {
      loadStudioVersionHistory: async (url, options) => {
        calls.push(['load', url, options]);
        throw new Error('versions unavailable');
      }
    },
    createLoadOptions: (url, token) => ({ url, token }),
    beforeLoad: (url, token) => calls.push(['before', url, token]),
    reportLoadError: (error, url, token) => calls.push(['error', error.message, url, token])
  });

  await controller.load('/presentations/demo/index.html', 7);

  assert.deepEqual(calls, [
    ['before', '/presentations/demo/index.html', 7],
    ['load', '/presentations/demo/index.html', { url: '/presentations/demo/index.html', token: 7 }],
    ['error', 'versions unavailable', '/presentations/demo/index.html', 7]
  ]);
});

test('editor wires the version history controller and keeps loadVersions as a compatibility handler', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /<script src="\/shared\/studio-editor-version-history-controller\.js"><\/script>/);
  assert.match(source, /studioEditorVersionHistoryShellRuntimeApi/);
  assert.match(
    source,
    /studioEditorVersionHistoryRuntimeAccessorsApi\s*\.\s*createStudioEditorVersionHistoryRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /studioEditorVersionHistoryShellRuntimeApi\s*\.\s*createStudioEditorVersionHistoryShellRuntime\(/
  );
  assert.match(source, /studioEditorVersionHistoryController\.load\(presentationUrl, sessionToken\)/);
  assert.doesNotMatch(source, /async function loadVersions\([^)]*\) \{[\s\S]*loadStudioVersionHistory\(/);
});
