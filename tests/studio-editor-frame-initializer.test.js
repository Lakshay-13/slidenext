const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frameInitializer = require('../shared/studio-editor-frame-initializer.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('frame initializer boots the controller and applies ready UI state', () => {
  const calls = [];
  const initializer = frameInitializer.createStudioEditorFrameInitializer({
    frameController: {
      init() {
        calls.push('init');
        return true;
      }
    },
    syncCanvasDimensions() {
      calls.push('sync-canvas');
    },
    setLoadingState(state) {
      calls.push(`loading:${state}`);
    },
    setAutoSaveStatus(state) {
      calls.push(`autosave:${state}`);
    }
  });

  assert.equal(initializer.initialize(), true);
  assert.deepEqual(calls, ['init', 'sync-canvas', 'loading:ready']);
});

test('frame initializer reports missing or failed controller startup', () => {
  const errorCalls = [];
  const initializer = frameInitializer.createStudioEditorFrameInitializer({
    frameController: {
      init() {
        throw new Error('bootstrap failed');
      }
    },
    setLoadingState(state) {
      errorCalls.push(`loading:${state}`);
    },
    setAutoSaveStatus(state) {
      errorCalls.push(`autosave:${state}`);
    }
  });

  assert.equal(initializer.initialize(), false);
  assert.deepEqual(errorCalls, ['loading:error', 'autosave:editor-load-failed']);
  assert.equal(
    frameInitializer.createStudioEditorFrameInitializer({
      setLoadingState: () => errorCalls.push('missing-loading')
    }).initialize(),
    false
  );
  assert.equal(errorCalls.at(-1), 'missing-loading');
});

test('index loads and uses the shared frame initializer', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-frame-initializer\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorFrameInitializerApi\.createStudioEditorFrameInitializer\(/
  );
  assert.match(
    fileContent,
    /return studioEditorFrameInitializer\.initialize\(\);/
  );
  const initStart = fileContent.indexOf('function initStudioFrame() {');
  const initEnd = fileContent.indexOf(
    '\n\n    // Apply hoverable tags to editable nodes',
    initStart
  );
  assert.ok(initStart >= 0);
  assert.ok(initEnd > initStart);
  assert.doesNotMatch(
    fileContent.slice(initStart, initEnd),
    /studioEditorFrameController\.init\(\)/
  );
});
