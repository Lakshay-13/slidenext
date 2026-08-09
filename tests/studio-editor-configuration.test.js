const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configuration = require('../shared/studio-editor-configuration.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor configuration preserves the selectable and editing policies', () => {
  assert.deepEqual(configuration.EDITOR_CHROME_NODE_IDS, [
    'editorSelectionOverlay',
    'editorGuidesLayer',
    'editorDragHud'
  ]);
  assert.match(configuration.EDITOR_SELECTABLE_SELECTOR, /\.editor-shape/);
  assert.match(configuration.EDITOR_PARENT_TARGET_SELECTOR, /\[role="button"\]/);
  assert.equal(configuration.EDITOR_INLINE_TEXT_TAGS.has('span'), true);
  assert.equal(configuration.EDITOR_INLINE_EDIT_TEXT_TAGS.has('td'), true);
  assert.deepEqual(configuration.RESIZE_HANDLE_DIRECTIONS, ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
});

test('index loads the shared editor configuration before consuming its aliases', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptIndex = source.indexOf('src="/shared/studio-editor-configuration.js"');
  const aliasIndex = source.indexOf('const editorConfiguration =');
  assert.ok(scriptIndex >= 0);
  assert.ok(aliasIndex > scriptIndex);
  assert.match(source, /const EDITOR_CHROME_NODE_IDS = editorConfiguration/);
  assert.match(source, /const EDITOR_INLINE_EDIT_TEXT_TAGS = editorConfiguration/);
});
