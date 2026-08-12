const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const wallpaperStateRuntime = require('../shared/studio-editor-wallpaper-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('wallpaper state runtime composes the wallpaper state store without options', () => {
  let callCount = 0;
  const stateStore = {
    createStudioEditorWallpaperStateStore() {
      callCount += 1;
      return { name: 'wallpaper-state' };
    }
  };

  assert.deepEqual(
    wallpaperStateRuntime.createStudioEditorWallpaperStateRuntime({ stateStore }),
    { wallpaperStateStore: { name: 'wallpaper-state' } }
  );
  assert.equal(callCount, 1);
});

test('index wires wallpaper state through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-wallpaper-state-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.wallpaperStateRuntime/);
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorWallpaperStateStore\.createStudioEditorWallpaperStateStore\(\)/
  );
});
