const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-template-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('template state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorTemplateStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    templateView: { name: 'template-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorTemplateStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorTemplateStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('template state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorTemplateStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorTemplateStateController(), null);
});

test('index routes template state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-template-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /templateStateRuntimeAccessors\s*\.\s*createStudioEditorTemplateStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorTemplateState\.createStudioEditorTemplateStateController\(/
  );
});
