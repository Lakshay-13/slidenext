const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-canonical-shell-runtime.js');

test('canonical shell runtime delegates the prepared canonical runtime options', () => {
  let receivedOptions = null;
  const runtimeOptions = { name: 'canonical-options' };
  const canonicalRuntimeApi = {
    createStudioEditorCanonicalRuntime(options) {
      receivedOptions = options;
      return { name: 'canonical-runtime' };
    }
  };

  const result = shellRuntime.createStudioEditorCanonicalShellRuntime({
    canonicalRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { name: 'canonical-runtime' });
  assert.equal(receivedOptions, runtimeOptions);
});

test('canonical shell runtime safely handles missing runtime options or factory', () => {
  let receivedOptions = null;
  const canonicalRuntimeApi = {
    createStudioEditorCanonicalRuntime(options) {
      receivedOptions = options;
      return null;
    }
  };

  assert.equal(
    shellRuntime.createStudioEditorCanonicalShellRuntime({ canonicalRuntimeApi }),
    null
  );
  assert.deepEqual(receivedOptions, {});
  assert.equal(shellRuntime.createStudioEditorCanonicalShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorCanonicalShellRuntime({ canonicalRuntimeApi: {} }),
    null
  );
});
