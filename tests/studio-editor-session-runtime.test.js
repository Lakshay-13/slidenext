const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sessionRuntime = require('../shared/studio-editor-session-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session runtime composes lifecycle controllers with shared callbacks', () => {
  const calls = [];
  const controllers = {
    sessionStateController: { name: 'session-state' },
    sessionResetController: { name: 'reset' },
    sessionUiController: { name: 'ui' },
    shellController: { name: 'shell' },
    presentationMetadataController: { name: 'metadata' }
  };
  const callback = () => {};
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });
  const options = {
    sessionApi: api(
      'session',
      'createStudioEditorPresentationSessionStateController',
      controllers.sessionStateController
    ),
    sessionResetApi: api(
      'reset',
      'createStudioEditorSessionResetController',
      controllers.sessionResetController
    ),
    sessionUiApi: api(
      'ui',
      'createStudioEditorSessionUiController',
      controllers.sessionUiController
    ),
    shellApi: api(
      'shell',
      'createStudioEditorShellController',
      controllers.shellController
    ),
    presentationMetadataApi: api(
      'metadata',
      'createStudioEditorPresentationMetadataController',
      controllers.presentationMetadataController
    ),
    getPresentationUrl: callback,
    getSessionToken: callback,
    setPresentationUrl: callback,
    persistenceApi: {},
    documentRef: {},
    getIframeDoc: callback,
    updateDeckReadyToolbarActionState: callback
  };

  assert.deepEqual(
    sessionRuntime.createStudioEditorSessionRuntime(options),
    controllers
  );
  assert.equal(calls[0][1].getPresentationUrl, callback);
  assert.equal(calls[1][1].persistenceApi, options.persistenceApi);
  assert.equal(calls[2][1].updateDeckReadyToolbarActionState, callback);
  assert.equal(calls[3][1].documentRef, options.documentRef);
  assert.equal(calls[4][1].getIframeDoc, callback);
});

test('index wires session lifecycle composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorSessionRuntimeOptionsApi\.createStudioEditorSessionRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorSessionRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorSessionRuntime = studioEditorSessionRuntimeAccessors/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSessionShellRuntime\.createStudioEditorSessionShellRuntime\(/
  );
  assert.match(
    fileContent,
    /resolveLoadOptions: \(sessionToken\) => createCurrentStudioPresentationMetadataLoadOptions\(sessionToken\)/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSession\.createStudioEditorPresentationSessionStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSessionResetController\.createStudioEditorSessionResetController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPresentationMetadataController\.createStudioEditorPresentationMetadataController\(/
  );
});
