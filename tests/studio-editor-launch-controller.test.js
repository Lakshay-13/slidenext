const test = require('node:test');
const assert = require('node:assert/strict');
const launchControllerApi = require('../shared/studio-editor-launch-controller.js');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach(value => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach(value => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createLaunchElements() {
  return {
    editor: {
      classList: createClassList(['hidden']),
      offsetWidth: 0,
      style: {}
    },
    iframe: {
      onload: null,
      src: '',
      srcdoc: ''
    },
    documentRef: {
      body: {
        style: {}
      }
    }
  };
}

test('launch controller wires frame loading before versions and metadata', async () => {
  const { editor, iframe, documentRef } = createLaunchElements();
  const calls = [];
  let resolveMetadata;
  const controller = launchControllerApi.createStudioEditorLaunchController({
    documentRef,
    createFrameLoadHandler(options) {
      calls.push(['frame-handler', options]);
      return () => {};
    },
    initStudioFrame() {
      calls.push(['init-frame']);
    },
    loadVersions(url, sessionToken) {
      calls.push(['versions', url, sessionToken]);
    },
    loadPresentationMetadata(url, title, sessionToken) {
      calls.push(['metadata-start', url, title, sessionToken]);
      return new Promise(resolve => {
        resolveMetadata = resolve;
      });
    },
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    getCurrentSessionToken: () => 7,
    resolveLaunchSource(metadata, url) {
      calls.push(['resolve-source', metadata, url]);
      return { kind: 'url', url, srcdoc: '' };
    },
    setFrameSource(nextIframe, url) {
      calls.push(['set-source', nextIframe, url]);
      nextIframe.src = url;
    }
  });

  const launchPromise = controller.launch({
    presentationUrl: '/presentations/demo/index.html',
    presentationTitle: 'Demo',
    editor,
    iframe,
    sessionToken: 7,
    frameLoadSessionStateReaders: { getCurrentPresentationUrl: () => '/presentations/demo/index.html' },
    isEditorActive: () => false
  });

  assert.deepEqual(calls.map(call => call[0]), [
    'frame-handler',
    'versions',
    'metadata-start'
  ]);
  assert.equal(iframe.src, '');

  resolveMetadata({ id: 'demo' });
  assert.equal(await launchPromise, true);
  assert.deepEqual(calls.map(call => call[0]), [
    'frame-handler',
    'versions',
    'metadata-start',
    'resolve-source',
    'set-source'
  ]);
  assert.equal(iframe.src, '/presentations/demo/index.html');
  assert.equal(editor.classList.contains('active'), true);
  assert.equal(documentRef.body.style.overflow, 'hidden');
});

test('launch controller rejects stale metadata without opening the editor', async () => {
  const { editor, iframe } = createLaunchElements();
  let shellOpenCount = 0;
  const controller = launchControllerApi.createStudioEditorLaunchController({
    createFrameLoadHandler: () => () => {},
    loadPresentationMetadata: async () => ({ id: 'stale' }),
    getCurrentPresentationUrl: () => '/presentations/other/index.html',
    getCurrentSessionToken: () => 9,
    shellController: {
      open() {
        shellOpenCount += 1;
        return true;
      }
    }
  });

  assert.equal(await controller.launch({
    presentationUrl: '/presentations/demo/index.html',
    editor,
    iframe,
    sessionToken: 9
  }), false);
  assert.equal(shellOpenCount, 0);
  assert.equal(editor.classList.contains('active'), false);
});

test('launch controller applies saved zoom only after the live frame guard passes', async () => {
  const { editor, iframe } = createLaunchElements();
  const scheduled = [];
  const zoomCalls = [];
  const guardCalls = [];
  const controller = launchControllerApi.createStudioEditorLaunchController({
    localStorageRef: {
      getItem(key) {
        assert.equal(key, 'presentationZoom');
        return '80';
      }
    },
    schedule(callback, delayMs) {
      scheduled.push({ callback, delayMs });
    },
    createFrameLoadHandler(options) {
      return () => options.afterLoad();
    },
    shouldHandleFrameLoad(url, options) {
      guardCalls.push([url, options]);
      return true;
    },
    applyZoom(value) {
      zoomCalls.push(value);
    },
    loadPresentationMetadata: async () => null,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    getCurrentSessionToken: () => 3,
    shellController: {
      open() {
        return true;
      }
    }
  });

  await controller.launch({
    presentationUrl: '/presentations/demo/index.html',
    editor,
    iframe,
    sessionToken: 3,
    isEditorActive: () => true
  });

  iframe.onload();
  assert.deepEqual(scheduled.map(item => item.delayMs), [150]);
  assert.deepEqual(zoomCalls, []);
  scheduled[0].callback();
  assert.deepEqual(zoomCalls, ['80']);
  assert.equal(guardCalls[0][1].sessionToken, 3);
});
