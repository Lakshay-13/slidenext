const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const slideRoutingRuntime = require('../shared/studio-editor-slide-routing-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('slide routing runtime composes route dependencies', () => {
  const calls = [];
  const routingApi = {
    createStudioEditorSlideRoutingController(options) {
      calls.push(options);
      return { name: 'slide-routing' };
    }
  };
  const options = {
    routingApi,
    deckViewApi: {},
    getSlideIndexById: () => 0,
    activateSlideByIndex: () => {},
    deleteSlideByIndex: () => true,
    reorderSlidesByIndex: () => true
  };

  assert.deepEqual(
    slideRoutingRuntime.createStudioEditorSlideRoutingRuntime(options),
    { slideRoutingController: { name: 'slide-routing' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].deckViewApi, options.deckViewApi);
  assert.equal(calls[0].getSlideIndexById, options.getSlideIndexById);
  assert.equal(calls[0].activateSlideByIndex, options.activateSlideByIndex);
  assert.equal(calls[0].deleteSlideByIndex, options.deleteSlideByIndex);
  assert.equal(calls[0].reorderSlidesByIndex, options.reorderSlidesByIndex);
});

test('index wires slide routing through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-routing-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-routing-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorSlideRoutingShellRuntime\.createStudioEditorSlideRoutingShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideRoutingController\.createStudioEditorSlideRoutingController\(/
  );
});
