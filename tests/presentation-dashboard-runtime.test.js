const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtime = require('../shared/presentation-dashboard-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('presentation dashboard runtime composes dashboard and creation controllers', () => {
  const calls = [];
  const documentRef = {};
  const presentationLibrary = {};
  const presentationLibraryView = {};
  const presentationCreationView = {};
  const loadPresentations = () => calls.push(['load']);
  const launchStudioEditor = (...args) => calls.push(['launch', ...args]);
  const dashboardController = { load() {} };
  const creationController = { submit() {} };

  const result = runtime.createPresentationDashboardRuntime({
    documentRef,
    presentationLibrary,
    presentationLibraryView,
    presentationCreationView,
    dashboardControllerApi: {
      createPresentationDashboardController(options) {
        assert.deepEqual(options, {
          documentRef,
          presentationLibrary,
          presentationLibraryView
        });
        return dashboardController;
      }
    },
    creationControllerApi: {
      createPresentationController(options) {
        assert.equal(options.documentRef, documentRef);
        assert.equal(options.presentationCreationView, presentationCreationView);
        assert.equal(options.presentationLibrary, presentationLibrary);
        assert.equal(options.loadPresentations, loadPresentations);
        assert.equal(options.launchStudioEditor, launchStudioEditor);
        return creationController;
      }
    },
    loadPresentations,
    launchStudioEditor
  });

  assert.equal(result.dashboardController, dashboardController);
  assert.equal(result.creationController, creationController);
  result.creationController.submit();
  assert.deepEqual(calls, []);
});

test('index wires dashboard and creation composition through the runtime module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/presentation-dashboard-runtime\.js"/);
  assert.match(source, /SlideNextPresentationDashboardRuntime\.createPresentationDashboardRuntime/);
  assert.match(source, /const presentationDashboardController = presentationDashboardRuntime/);
  assert.match(source, /const presentationCreationController = presentationDashboardRuntime/);
});
