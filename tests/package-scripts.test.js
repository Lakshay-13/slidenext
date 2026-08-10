const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

test('package exposes the generalized canonical PPTX export command', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );

  assert.equal(packageJson.scripts['export:pptx'], 'node scripts/export-canonical-pptx.js');
});

test('package exposes the generalized canonical PDF export command', () => {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

  assert.equal(packageJson.scripts['export:pdf'], 'node scripts/export-canonical-pdf.js');
});
