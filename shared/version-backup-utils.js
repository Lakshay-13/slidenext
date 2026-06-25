(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.VersionBackupUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const VERSION_BACKUP_TIMESTAMP_PATTERN = String.raw`(?:\d{8}|\d{4}-\d{2}-\d{2})_\d{6}(?:_\d{3})?`;

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildVersionBackupRegex(base, ext) {
    return new RegExp(`^${escapeRegex(base)}_${VERSION_BACKUP_TIMESTAMP_PATTERN}(?:_.*)?${escapeRegex(ext)}$`);
  }

  function extractVersionTimestampPrefix(versionFilename, base, ext) {
    const match = versionFilename.match(
      new RegExp(`^(${escapeRegex(base)}_${VERSION_BACKUP_TIMESTAMP_PATTERN})(?:_.*)?${escapeRegex(ext)}$`)
    );
    return match ? match[1] : '';
  }

  function deriveVersionDisplayLabel(versionFilename, deckBaseName) {
    const prefix = `${deckBaseName}_`;
    let cleanName = versionFilename;

    if (cleanName.startsWith(prefix)) {
      cleanName = cleanName.substring(prefix.length);
    }

    const extIndex = cleanName.lastIndexOf('.');
    if (extIndex !== -1) {
      cleanName = cleanName.substring(0, extIndex);
    }

    const labelMatch = cleanName.match(
      new RegExp(`^${VERSION_BACKUP_TIMESTAMP_PATTERN}_(.+)$`)
    );
    if (labelMatch) {
      return labelMatch[1]
        .replace(/__/g, ': ')
        .replace(/_/g, ' ');
    }

    if (versionFilename.includes('Auto')) {
      return 'Auto Saved Version';
    }

    return 'Manual Checkpoint';
  }

  return {
    VERSION_BACKUP_TIMESTAMP_PATTERN,
    escapeRegex,
    buildVersionBackupRegex,
    extractVersionTimestampPrefix,
    deriveVersionDisplayLabel
  };
});
