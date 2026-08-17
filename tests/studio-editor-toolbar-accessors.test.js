const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-toolbar-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-toolbar-accessors.js');

test('toolbar accessors delegate grid snap and theme commands', () => {
  const calls = [];
  const accessors = accessorsApi.createStudioEditorToolbarAccessors({
    gridSnapController: {
      sync: () => {
        calls.push('grid-sync');
        return true;
      },
      toggle: () => {
        calls.push('grid-toggle');
        return true;
      }
    },
    themeController: {
      toggleGlobalTheme: () => {
        calls.push('theme-toggle');
        return true;
      },
      syncIframeTheme: () => {
        calls.push('theme-sync');
        return true;
      }
    }
  });

  assert.equal(accessors.updateGridSnapActionState(), true);
  assert.equal(accessors.toggleGridSnap(), true);
  assert.equal(accessors.toggleGlobalTheme(), true);
  assert.equal(accessors.syncIframeTheme(), true);
  assert.deepEqual(calls, ['grid-sync', 'grid-toggle', 'theme-toggle', 'theme-sync']);
});

test('toolbar accessors bind layout controls to shared controllers', () => {
  const controlIds = [
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn',
    'distributeSelectionHorizontalBtn',
    'distributeSelectionVerticalBtn',
    'groupSelectionBtn',
    'ungroupSelectionBtn',
    'nudgeSelectionUpBtn',
    'nudgeSelectionLeftBtn',
    'nudgeSelectionRightBtn',
    'nudgeSelectionDownBtn',
    'arrangeLayerFrontBtn',
    'arrangeLayerBackBtn',
    'arrangeLayerForwardBtn',
    'arrangeLayerBackwardBtn',
    'toggleGridSnapBtn'
  ];
  const controls = Object.fromEntries(controlIds.map((id) => [id, {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  }]));
  const calls = [];
  const accessors = accessorsApi.createStudioEditorToolbarAccessors({
    gridSnapController: {
      toggle: () => calls.push(['grid'])
    },
    alignmentController: {
      align: (action) => calls.push(['align', action]),
      distribute: (axis) => calls.push(['distribute', axis])
    },
    groupController: {
      group: () => calls.push(['group']),
      ungroup: () => calls.push(['ungroup'])
    },
    nudgeController: {
      nudge: (dx, dy) => calls.push(['nudge', dx, dy])
    },
    arrangeElementLayer: (action) => calls.push(['layer', action])
  });
  const documentRef = {
    getElementById(id) {
      return controls[id] || null;
    }
  };

  assert.deepEqual(
    accessors.bindStudioEditorLayoutControls({ documentRef }),
    Object.fromEntries(controlIds.map((id) => [id, true]))
  );
  controlIds.forEach((id) => controls[id].listeners.click());
  assert.deepEqual(calls, [
    ['align', 'left'],
    ['align', 'center'],
    ['align', 'right'],
    ['align', 'top'],
    ['align', 'middle'],
    ['align', 'bottom'],
    ['distribute', 'horizontal'],
    ['distribute', 'vertical'],
    ['group'],
    ['ungroup'],
    ['nudge', 0, -1],
    ['nudge', -1, 0],
    ['nudge', 1, 0],
    ['nudge', 0, 1],
    ['layer', 'front'],
    ['layer', 'back'],
    ['layer', 'forward'],
    ['layer', 'backward'],
    ['grid']
  ]);
});

test('toolbar accessors preserve safe fallbacks without controllers', () => {
  const accessors = accessorsApi.createStudioEditorToolbarAccessors();

  assert.equal(accessors.updateGridSnapActionState(), false);
  assert.equal(accessors.toggleGridSnap(), false);
  assert.equal(accessors.toggleGlobalTheme(), false);
  assert.equal(accessors.syncIframeTheme(), false);
});

test('toolbar accessors bind selection controls to editor commands', () => {
  const controlIds = [
    'toggleLockSelectionBtn',
    'toggleVisibilitySelectionBtn',
    'removeSelectionBtn',
    'deselectSelectionBtn'
  ];
  const controls = Object.fromEntries(controlIds.map((id) => [id, {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  }]));
  const calls = [];
  const accessors = accessorsApi.createStudioEditorToolbarAccessors({
    toggleSelectedElementsLockState: () => calls.push('lock'),
    toggleSelectedElementsVisibility: () => calls.push('visibility'),
    removeSelectedElement: () => calls.push('remove'),
    deselectElement: () => calls.push('deselect')
  });
  const documentRef = {
    getElementById(id) {
      return controls[id] || null;
    }
  };

  assert.deepEqual(
    accessors.bindStudioEditorSelectionControls({ documentRef }),
    Object.fromEntries(controlIds.map((id) => [id, true]))
  );
  controlIds.forEach((id) => controls[id].listeners.click());
  assert.deepEqual(calls, ['lock', 'visibility', 'remove', 'deselect']);
});

test('toolbar global api preserves the editor shell function names', () => {
  const calls = [];
  const accessors = {
    updateGridSnapActionState: () => calls.push('grid-sync'),
    toggleGridSnap: () => calls.push('grid-toggle'),
    toggleGlobalTheme: () => calls.push('theme-toggle'),
    syncIframeTheme: () => calls.push('theme-sync')
  };
  const globalApi = accessorsApi.createStudioEditorToolbarGlobalApi({ accessors });

  globalApi.updateGridSnapActionState();
  globalApi.toggleGridSnap();
  globalApi.toggleGlobalTheme();
  globalApi.syncIframeTheme();

  assert.deepEqual(calls, ['grid-sync', 'grid-toggle', 'theme-toggle', 'theme-sync']);
});

test('toolbar accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorToolbarAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorToolbarAccessors
      .createStudioEditorToolbarAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorToolbarAccessors
      .createStudioEditorToolbarGlobalApi,
    'function'
  );
});

test('editor loads toolbar accessors after the theme runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  ['globalThemeToggleBtn', 'studioThemeToggleBtn'].forEach((id) => {
    const line = fileContent.split('\n').find((candidate) => candidate.includes(`id="${id}"`));
    assert.ok(line, `Missing theme control: ${id}`);
    assert.doesNotMatch(line, /onclick=/);
  });
  [
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn',
    'distributeSelectionHorizontalBtn',
    'distributeSelectionVerticalBtn',
    'groupSelectionBtn',
    'ungroupSelectionBtn',
    'nudgeSelectionUpBtn',
    'nudgeSelectionLeftBtn',
    'nudgeSelectionRightBtn',
    'nudgeSelectionDownBtn',
    'arrangeLayerFrontBtn',
    'arrangeLayerBackBtn',
    'arrangeLayerForwardBtn',
    'arrangeLayerBackwardBtn',
    'toggleGridSnapBtn'
  ].forEach((id) => {
    const line = fileContent.split('\n').find((candidate) => candidate.includes(`id="${id}"`));
    assert.ok(line, `Missing layout control: ${id}`);
    assert.doesNotMatch(line, /onclick=/);
  });
  [
    'toggleLockSelectionBtn',
    'toggleVisibilitySelectionBtn',
    'removeSelectionBtn',
    'deselectSelectionBtn'
  ].forEach((id) => {
    const line = fileContent.split('\n').find((candidate) => candidate.includes(`id="${id}"`));
    assert.ok(line, `Missing selection control: ${id}`);
    assert.doesNotMatch(line, /onclick=/);
  });

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-toolbar-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-toolbar-shell-composition\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorToolbarShellComposition\(/);
  assert.match(fileContent, /documentRef: document/);
  assert.match(fileContent, /studioEditorToolbarAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorToolbarGlobalApi\)/);
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorToolbarAccessors\.createStudioEditorToolbarAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorToolbarAccessors\.createStudioEditorToolbarGlobalApi\(/
  );
  assert.doesNotMatch(fileContent, /function updateGridSnapActionState\(\)/);
  assert.doesNotMatch(fileContent, /function toggleGridSnap\(\)/);
  assert.doesNotMatch(fileContent, /function toggleGlobalTheme\(\)/);
  assert.doesNotMatch(fileContent, /function syncIframeTheme\(\)/);
});
