const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-slide-routing-shell-runtime.js');
const routingAccessors = require('../shared/studio-editor-slide-routing-accessors.js');

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

test('slide routing accessors compose the shell runtime and preserve its result', () => {
  const runtime = { slideRoutingController: { name: 'routing' } };
  const runtimeOptions = { getSlideIndexById: () => 0 };
  const calls = [];
  const runtimeApi = {
    createStudioEditorSlideRoutingShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const accessors = routingAccessors.createStudioEditorSlideRoutingAccessors({
    runtimeApi,
    routingRuntimeApi: { name: 'runtime' },
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].routingRuntimeApi.name, 'runtime');
  assert.equal(calls[0].runtimeOptions, runtimeOptions);
});

test('slide routing accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = routingAccessors.createStudioEditorSlideRoutingAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
