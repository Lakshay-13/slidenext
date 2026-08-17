const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-toolbar-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('toolbar shell composition wires callbacks, control bindings, and globals', () => {
  const accessors = {};
  const globalApi = { toggleGridSnap() {} };
  const documentRef = { id: 'document' };
  const calls = [];
  let accessorOptions = null;
  let globalOptions = null;
  accessors.bindStudioEditorLayoutControls = (options) => calls.push(['layout', options]);
  accessors.bindStudioEditorSelectionControls = (options) => calls.push(['selection', options]);

  const result = composition.createStudioEditorToolbarShellComposition({
    accessorsApi: {
      createStudioEditorToolbarAccessors(options) {
        accessorOptions = options;
        return accessors;
      },
      createStudioEditorToolbarGlobalApi(options) {
        globalOptions = options;
        return globalApi;
      }
    },
    gridSnapController: { id: 'grid' },
    themeController: { id: 'theme' },
    alignmentController: { id: 'alignment' },
    groupController: { id: 'group' },
    nudgeController: { id: 'nudge' },
    arrangeElementLayer: () => true,
    toggleSelectedElementsLockState: () => true,
    toggleSelectedElementsVisibility: () => true,
    removeSelectedElement: () => true,
    deselectElement: () => true,
    documentRef
  });

  assert.equal(result.accessors, accessors);
  assert.equal(result.globalApi, globalApi);
  assert.equal(accessorOptions.gridSnapController.id, 'grid');
  assert.equal(accessorOptions.themeController.id, 'theme');
  assert.equal(accessorOptions.alignmentController.id, 'alignment');
  assert.equal(accessorOptions.groupController.id, 'group');
  assert.equal(accessorOptions.nudgeController.id, 'nudge');
  assert.equal(typeof accessorOptions.arrangeElementLayer, 'function');
  assert.deepEqual(calls, [
    ['layout', { documentRef }],
    ['selection', { documentRef }]
  ]);
  assert.equal(globalOptions.accessors, accessors);
});

test('toolbar shell composition fails closed without shared accessors', () => {
  assert.deepEqual(
    composition.createStudioEditorToolbarShellComposition({ accessorsApi: null }),
    { accessors: null, globalApi: {} }
  );
});

test('index routes toolbar assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const accessorsScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-toolbar-accessors.js"></script>'
  );
  const compositionScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-toolbar-shell-composition.js"></script>'
  );

  assert.ok(accessorsScriptIndex >= 0);
  assert.ok(compositionScriptIndex > accessorsScriptIndex);
  assert.match(source, /studioEditorToolbarShellCompositionApi/);
  assert.match(source, /createStudioEditorToolbarShellComposition/);
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorToolbarAccessors\.createStudioEditorToolbarAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorToolbarAccessors\.createStudioEditorToolbarGlobalApi\(/
  );
});
