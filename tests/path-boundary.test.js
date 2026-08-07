const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { isPathWithin } = require('../shared/path-boundary.js');

test('isPathWithin accepts the directory and descendants but rejects traversal and sibling prefixes', () => {
  const workspaceDir = path.join(path.parse(process.cwd()).root, 'slidenext-workspace');

  assert.equal(isPathWithin(workspaceDir, workspaceDir), true);
  assert.equal(isPathWithin(workspaceDir, path.join(workspaceDir, 'presentations', 'deck', 'index.html')), true);
  assert.equal(isPathWithin(workspaceDir, path.join(workspaceDir, '..', 'slidenext-workspace-other', 'index.html')), false);
  assert.equal(isPathWithin(workspaceDir, path.join(workspaceDir, '..', 'outside', 'index.html')), false);
});
