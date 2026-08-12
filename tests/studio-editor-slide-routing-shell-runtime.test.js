const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-slide-routing-shell-runtime.js');

test('slide routing shell runtime delegates the prepared route options', () => {
  let receivedOptions = null;
  const runtimeOptions = { getSlideIndexById: () => 0 };
  const routingRuntimeApi = {
    createStudioEditorSlideRoutingRuntime(options) {
      receivedOptions = options;
      return { name: 'slide-routing-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorSlideRoutingShellRuntime({
      routingRuntimeApi,
      runtimeOptions
    }),
    { name: 'slide-routing-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('slide routing shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorSlideRoutingShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorSlideRoutingShellRuntime({ routingRuntimeApi: {} }),
    null
  );
});
