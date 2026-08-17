const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/presentation-dashboard-shell-composition.js');

test('dashboard shell composition wires controllers, creation binding, and globals', () => {
  const calls = [];
  const documentRef = { id: 'document' };
  const dashboardController = { id: 'dashboard' };
  const creationController = {
    id: 'creation',
    bindPresentationCreationButtons(options) {
      calls.push(['bind', options]);
    }
  };
  const accessors = { id: 'accessors' };
  const globalApi = { loadPresentations() {} };

  const result = composition.createPresentationDashboardShellComposition({
    documentRef,
    loadPresentations() {},
    launchPresentation() {},
    launchStudioEditor() {},
    runtimeApi: {
      createPresentationDashboardRuntime(options) {
        assert.equal(options.documentRef, documentRef);
        return { dashboardController, creationController };
      }
    },
    accessorsApi: {
      createPresentationDashboardAccessors(options) {
        assert.deepEqual(options, { dashboardController, creationController });
        return accessors;
      },
      createPresentationDashboardGlobalApi(options) {
        assert.equal(options.accessors, accessors);
        return globalApi;
      }
    }
  });

  assert.equal(result.dashboardController, dashboardController);
  assert.equal(result.creationController, creationController);
  assert.equal(result.accessors, accessors);
  assert.equal(result.globalApi, globalApi);
  assert.deepEqual(calls, [['bind', { documentRef }]]);
});

test('dashboard shell composition fails closed without runtime dependencies', () => {
  const result = composition.createPresentationDashboardShellComposition({
    runtimeApi: null,
    accessorsApi: null
  });

  assert.deepEqual(result, {
    runtime: null,
    dashboardController: null,
    creationController: null,
    accessors: null,
    globalApi: {}
  });
});
