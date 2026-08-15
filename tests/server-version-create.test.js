const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createVersionBackupPair, workspaceDir } = require('../server.js');

test('paired version backup removes the HTML backup when metadata backup fails', async () => {
  const targetFile = path.join(workspaceDir, 'presentations', 'pair-test', 'index.html');
  const backupFilename = 'index_20260101_120000_named.html';
  const removedPaths = [];

  await assert.rejects(
    createVersionBackupPair({
      targetFile,
      htmlContent: '<!doctype html>',
      versionLabel: 'named',
      metadataInfo: { metadataFile: path.join(workspaceDir, 'presentations', 'pair-test', 'presentation.json') },
      metadata: { title: 'Pair test' },
      createHtmlBackup: async () => backupFilename,
      createMetadataBackup: async () => {
        throw new Error('metadata disk full');
      },
      removeBackup: async (backupPath) => {
        removedPaths.push(backupPath);
      }
    }),
    /metadata disk full/
  );

  assert.deepEqual(removedPaths, [
    path.join(workspaceDir, 'presentations', 'pair-test', '.versions', backupFilename)
  ]);
});
