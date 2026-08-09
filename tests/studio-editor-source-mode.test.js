const test = require('node:test');
const assert = require('node:assert/strict');

const sourceMode = require('../shared/studio-editor-source-mode.js');

test('source mode builds and extracts a replaceable custom CSS block', () => {
  const block = sourceMode.buildStudioSourceCssBlock('.slide { color: red; }');
  assert.equal(
    block,
    '<style data-slidenext-source-css="custom">\n.slide { color: red; }\n</style>'
  );
  assert.equal(sourceMode.extractStudioSourceCss(`<head>${block}</head>`), '.slide { color: red; }');
});

test('source mode replaces marked CSS without disturbing surrounding HTML', () => {
  const source = '<html><head><style>.layout { display: grid; }</style>'
    + '<style data-slidenext-source-css="custom">\n.old { color: red; }\n</style></head>'
    + '<body><section class="slide"></section></body></html>';
  const nextSource = sourceMode.replaceStudioSourceCss(source, '.new { color: blue; }');

  assert.match(nextSource, /\.layout \{ display: grid; \}/);
  assert.match(nextSource, /data-slidenext-source-css="custom">\n\.new \{ color: blue; \}\n<\/style>/);
  assert.doesNotMatch(nextSource, /\.old \{ color: red; \}/);
  assert.match(nextSource, /<section class="slide"><\/section>/);
});

test('source mode appends CSS for legacy HTML and can clear its own marker', () => {
  const legacySource = '<html><head><style>.legacy { color: red; }</style></head><body></body></html>';
  const markedSource = sourceMode.replaceStudioSourceCss(legacySource, '.new { color: blue; }');
  assert.match(markedSource, /\.legacy \{ color: red; \}/);
  assert.match(markedSource, /data-slidenext-source-css="custom"/);

  const clearedSource = sourceMode.replaceStudioSourceCss(markedSource, '');
  assert.doesNotMatch(clearedSource, /data-slidenext-source-css="custom"/);
  assert.match(clearedSource, /\.legacy \{ color: red; \}/);
});
