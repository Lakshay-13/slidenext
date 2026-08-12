const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-session-shell-runtime.js');

test('session shell runtime delegates prepared lifecycle options', () => {
  let receivedOptions = null;
  const runtimeOptions = { name: 'session-options' };
  const sessionRuntimeApi = {
    createStudioEditorSessionRuntime(options) {
      receivedOptions = options;
      return { name: 'session-runtime' };
    }
  };

  const result = shellRuntime.createStudioEditorSessionShellRuntime({
    sessionRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { name: 'session-runtime' });
  assert.equal(receivedOptions, runtimeOptions);
});

test('session shell runtime safely handles missing options or factory', () => {
  let receivedOptions = null;
  const sessionRuntimeApi = {
    createStudioEditorSessionRuntime(options) {
      receivedOptions = options;
      return null;
    }
  };

  assert.equal(
    shellRuntime.createStudioEditorSessionShellRuntime({ sessionRuntimeApi }),
    null
  );
  assert.deepEqual(receivedOptions, {});
  assert.equal(shellRuntime.createStudioEditorSessionShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorSessionShellRuntime({ sessionRuntimeApi: {} }),
    null
  );
});
