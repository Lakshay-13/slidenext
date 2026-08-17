const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/presentation-dashboard-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'presentation-dashboard-accessors.js');
const SHELL_COMPOSITION_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'presentation-dashboard-shell-composition.js'
);

test('dashboard accessors delegate dashboard and creation commands', async () => {
  const calls = [];
  const accessors = accessorsApi.createPresentationDashboardAccessors({
    dashboardController: {
      setLoadingState: () => {
        calls.push('loading');
        return true;
      },
      load: () => {
        calls.push('load');
        return Promise.resolve(['deck']);
      },
      filter: (category) => {
        calls.push(['filter', category]);
        return 'filtered';
      }
    },
    creationController: {
      open: () => {
        calls.push('open');
        return true;
      },
      close: () => {
        calls.push('close');
        return true;
      },
      submit: (event) => {
        calls.push(['submit', event]);
        return Promise.resolve({ url: '/new' });
      }
    }
  });

  assert.equal(accessors.setLoadingState(), true);
  assert.deepEqual(await accessors.load(), ['deck']);
  assert.equal(accessors.filter('Research'), 'filtered');
  assert.equal(accessors.openCreate(), true);
  assert.equal(accessors.closeCreate(), true);
  const event = { id: 'submit-event' };
  assert.deepEqual(await accessors.submitCreate(event), { url: '/new' });
  assert.deepEqual(calls, [
    'loading',
    'load',
    ['filter', 'Research'],
    'open',
    'close',
    ['submit', event]
  ]);
});

test('dashboard accessors preserve command fallbacks without controllers', async () => {
  const accessors = accessorsApi.createPresentationDashboardAccessors();

  assert.equal(accessors.setLoadingState(), false);
  assert.deepEqual(await accessors.load(), []);
  assert.equal(accessors.filter('Research'), '');
  assert.equal(accessors.openCreate(), false);
  assert.equal(accessors.closeCreate(), false);
  assert.equal(await accessors.submitCreate({}), null);
});

test('dashboard global api preserves the editor shell function names', async () => {
  const calls = [];
  const accessors = {
    setLoadingState: () => calls.push('loading'),
    load: () => calls.push('load'),
    filter: (category) => calls.push(['filter', category]),
    openCreate: () => calls.push('open'),
    closeCreate: () => calls.push('close'),
    submitCreate: (event) => calls.push(['submit', event])
  };
  const globalApi = accessorsApi.createPresentationDashboardGlobalApi({ accessors });
  const event = { id: 'event' };

  globalApi.setPresentationLibraryLoadingState();
  await globalApi.loadPresentations();
  globalApi.filterCategory('Research');
  globalApi.openCreatePresentationModal();
  globalApi.closeCreatePresentationModal();
  await globalApi.submitCreatePresentation(event);

  assert.deepEqual(calls, [
    'loading',
    'load',
    ['filter', 'Research'],
    'open',
    'close',
    ['submit', event]
  ]);
});

test('dashboard accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextPresentationDashboardAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextPresentationDashboardAccessors
      .createPresentationDashboardAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextPresentationDashboardAccessors
      .createPresentationDashboardGlobalApi,
    'function'
  );
});

test('editor loads dashboard accessors after the dashboard runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const shellComposition = fs.readFileSync(SHELL_COMPOSITION_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/presentation-dashboard-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/presentation-dashboard-shell-composition\.js"><\/script>/
  );
  assert.match(shellComposition, /createPresentationDashboardAccessors\(/);
  assert.match(shellComposition, /createPresentationDashboardGlobalApi\(/);
  assert.match(fileContent, /presentationDashboardAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, presentationDashboardGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function setPresentationLibraryLoadingState\(\)/);
  assert.doesNotMatch(fileContent, /async function loadPresentations\(\)/);
  assert.doesNotMatch(fileContent, /function openCreatePresentationModal\(\)/);
  assert.doesNotMatch(fileContent, /function closeCreatePresentationModal\(\)/);
  assert.doesNotMatch(fileContent, /async function submitCreatePresentation\(event\)/);
  assert.doesNotMatch(fileContent, /function filterCategory\(cat\)/);
});
