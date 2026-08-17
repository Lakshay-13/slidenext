const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-shell-state-global-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('shell-state global composition publishes all state accessor APIs', () => {
  const definitions = [
    ['sessionState', 'createStudioEditorSessionStateGlobalApi'],
    ['state', 'createStudioEditorStateGlobalApi'],
    ['history', 'createStudioEditorHistoryGlobalApi'],
    ['persistedDeck', 'createStudioEditorPersistedDeckGlobalApi'],
    ['timerState', 'createStudioEditorTimerStateGlobalApi']
  ];
  const options = {};
  const expected = {};

  definitions.forEach(([name, factoryName]) => {
    const accessors = { name: `${name}-accessors` };
    const api = {
      [factoryName]({ accessors: receivedAccessors }) {
        assert.equal(receivedAccessors, accessors);
        return { name: `${name}-global` };
      }
    };
    options[`${name}AccessorsApi`] = api;
    options[`${name}Accessors`] = accessors;
    expected[`${name}GlobalApi`] = { name: `${name}-global` };
  });

  assert.deepEqual(
    composition.createStudioEditorShellStateGlobalComposition(options),
    expected
  );
});

test('shell-state global composition fails closed without accessor APIs', () => {
  assert.deepEqual(
    composition.createStudioEditorShellStateGlobalComposition({}),
    {
      sessionStateGlobalApi: {},
      stateGlobalApi: {},
      historyGlobalApi: {},
      persistedDeckGlobalApi: {},
      timerStateGlobalApi: {}
    }
  );
});

test('index routes shell-state global publication through the composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const shellCompositionIndex = source.indexOf(
    '<script src="/shared/studio-editor-shell-state-composition.js"></script>'
  );
  const globalCompositionIndex = source.indexOf(
    '<script src="/shared/studio-editor-shell-state-global-composition.js"></script>'
  );

  assert.ok(shellCompositionIndex >= 0);
  assert.ok(globalCompositionIndex > shellCompositionIndex);
  assert.match(source, /studioEditorShellStateGlobalCompositionApi/);
  assert.match(source, /createStudioEditorShellStateGlobalComposition/);
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorSessionStateAccessors\.createStudioEditorSessionStateGlobalApi\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorStateAccessors\.createStudioEditorStateGlobalApi\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorHistoryAccessors\.createStudioEditorHistoryGlobalApi\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorPersistedDeckAccessors\.createStudioEditorPersistedDeckGlobalApi\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorTimerStateAccessors\.createStudioEditorTimerStateGlobalApi\(/
  );
});
