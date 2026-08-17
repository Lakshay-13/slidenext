const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-frame-accessors-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('frame accessors shell composition wires accessor options and global API', () => {
  const accessors = { getDocument() {} };
  const globalApi = { getIframeDoc() {} };
  const accessorOptions = {
    documentRef: { id: 'document' },
    domOptions: { slideSelector: '.slide' },
    overlayOptions: { visibleClassName: 'visible' }
  };
  let receivedOptions = null;
  let receivedGlobalOptions = null;

  const result = composition.createStudioEditorFrameAccessorsShellComposition({
    accessorsApi: {
      createStudioEditorFrameAccessors(options) {
        receivedOptions = options;
        return accessors;
      },
      createStudioEditorFrameGlobalApi(options) {
        receivedGlobalOptions = options;
        return globalApi;
      }
    },
    accessorOptions
  });

  assert.equal(result.accessors, accessors);
  assert.equal(result.globalApi, globalApi);
  assert.deepEqual(receivedOptions, accessorOptions);
  assert.equal(receivedGlobalOptions.accessors, accessors);
});

test('frame accessors shell composition fails closed without shared accessors', () => {
  assert.deepEqual(
    composition.createStudioEditorFrameAccessorsShellComposition({ accessorsApi: null }),
    { accessors: null, globalApi: {} }
  );
});

test('index routes both frame accessor installations through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const accessorScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-frame-accessors.js"></script>'
  );
  const compositionScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-frame-accessors-shell-composition.js"></script>'
  );

  assert.ok(accessorScriptIndex >= 0);
  assert.ok(compositionScriptIndex > accessorScriptIndex);
  assert.match(source, /createStudioEditorFrameAccessorsShellComposition/);
  assert.match(source, /studioEditorFrameAccessorsShellCompositionApi/);
  assert.doesNotMatch(
    source,
    /studioEditorFrameAccessorsApi\s*\.\s*createStudioEditorFrameAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /studioEditorFrameAccessorsApi\s*\.\s*createStudioEditorFrameGlobalApi\(/
  );
});
