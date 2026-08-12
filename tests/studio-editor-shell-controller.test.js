const test = require('node:test');
const assert = require('node:assert/strict');
const shell = require('../shared/studio-editor-shell-controller.js');

function createClassList() {
  const values = new Set();
  return {
    add(...names) {
      names.forEach(name => values.add(name));
    },
    remove(...names) {
      names.forEach(name => values.delete(name));
    },
    contains(name) {
      return values.has(name);
    }
  };
}

function createShellElements() {
  return {
    editor: {
      classList: createClassList(),
      offsetWidth: 0,
      style: {}
    },
    iframe: {
      onload: () => {},
      src: 'old.html',
      srcdoc: 'old source'
    },
    documentRef: {
      body: {
        style: {}
      }
    }
  };
}

test('editor shell controller opens the iframe and activates the editor shell', () => {
  const { editor, iframe, documentRef } = createShellElements();
  editor.classList.add('hidden');
  const controller = shell.createStudioEditorShellController({ documentRef });

  assert.equal(controller.open(editor, iframe, 'presentations/demo/index.html'), true);
  assert.equal(iframe.src, 'presentations/demo/index.html');
  assert.equal(iframe.srcdoc, '');
  assert.equal(editor.classList.contains('hidden'), false);
  assert.equal(editor.classList.contains('active'), true);
  assert.equal(editor.style.opacity, '1');
  assert.equal(editor.style.pointerEvents, 'auto');
  assert.equal(documentRef.body.style.overflow, 'hidden');
});

test('editor shell controller closes the iframe and hides the shell after its transition', () => {
  const { editor, iframe, documentRef } = createShellElements();
  const scheduled = [];
  editor.classList.add('active');
  const controller = shell.createStudioEditorShellController({
    documentRef,
    schedule: (callback, delayMs) => scheduled.push({ callback, delayMs })
  });

  assert.equal(controller.close(editor, iframe), true);
  assert.equal(iframe.onload, null);
  assert.equal(iframe.src, '');
  assert.equal(iframe.srcdoc, '');
  assert.equal(editor.classList.contains('active'), false);
  assert.equal(editor.style.opacity, '0');
  assert.equal(editor.style.pointerEvents, 'none');
  assert.equal(documentRef.body.style.overflow, '');
  assert.deepEqual(scheduled.map(item => item.delayMs), [300]);

  scheduled[0].callback();
  assert.equal(editor.classList.contains('hidden'), true);
});

test('editor shell controller opens canonical source through srcdoc', () => {
  const { editor, iframe, documentRef } = createShellElements();
  const controller = shell.createStudioEditorShellController({ documentRef });

  assert.equal(controller.open(editor, iframe, 'presentations/demo/index.html', {
    kind: 'srcdoc',
    srcdoc: '<html>canonical</html>'
  }), true);
  assert.equal(iframe.src, '');
  assert.equal(iframe.srcdoc, '<html>canonical</html>');
});

test('editor shell controller delegates frame source assignment to the launch source module', () => {
  const { editor, iframe, documentRef } = createShellElements();
  const calls = [];
  const controller = shell.createStudioEditorShellController({
    documentRef,
    launchSourceApi: {
      applyStudioEditorLaunchSource(nextIframe, url, source) {
        calls.push([nextIframe, url, source]);
        nextIframe.src = url;
        nextIframe.srcdoc = '';
        return true;
      }
    }
  });
  const source = { kind: 'url', srcdoc: '' };

  assert.equal(controller.open(editor, iframe, '/presentations/demo/index.html', source), true);
  assert.deepEqual(calls, [[iframe, '/presentations/demo/index.html', source]]);
  assert.equal(iframe.src, '/presentations/demo/index.html');
});
