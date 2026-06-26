const test = require('node:test');
const assert = require('node:assert/strict');

const versionBackupUtils = require('../shared/version-backup-utils');

test('deriveSiblingVersionBackupFilename maps html backup filenames onto companion sidecar backups', () => {
  assert.equal(
    versionBackupUtils.deriveSiblingVersionBackupFilename(
      'index_20260101_010203_004_Auto_Updated_Deck.html',
      'index',
      '.html',
      'presentation',
      '.json'
    ),
    'presentation_20260101_010203_004_Auto_Updated_Deck.json'
  );

  assert.equal(
    versionBackupUtils.deriveSiblingVersionBackupFilename(
      'not-a-version.html',
      'index',
      '.html',
      'presentation',
      '.json'
    ),
    ''
  );
});
