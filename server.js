const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const {
  buildVersionBackupRegex,
  extractVersionTimestampPrefix,
  deriveSiblingVersionBackupFilename
} = require('./shared/version-backup-utils');
const presentationMetadata = require('./shared/presentation-metadata');
const canonicalPptxExport = require('./shared/canonical-pptx-export');
const { isPathWithin } = require('./shared/path-boundary');

const app = express();
const PORT = 11004;

// Increase JSON limit to support uploading entire HTML documents
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Serve static workspace files
const workspaceDir = path.resolve(__dirname);
app.use(express.static(workspaceDir));

// 1. API: List presentations categorized by presentations/presentations.json configuration
app.get('/api/presentations', async (req, res) => {
  try {
    const configPath = path.join(workspaceDir, 'presentations', 'presentations.json');
    const fileContent = await fs.readFile(configPath, 'utf8');
    const list = JSON.parse(fileContent);

    // Process and enrich entries
    const processedList = list.map(pres => {
      const category = pres.category || 'General';
      const folder = pres.folder;
      
      // Standardized paths relative to workspace directory
      const relPath = `presentations/${folder}/index.html`;

      return {
        ...pres,
        url: relPath,
        relativePath: relPath, // Used for save/restore API routing
        category: category
      };
    });

    // Group by category
    const categoriesMap = {};
    processedList.forEach(pres => {
      const cat = pres.category;
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = [];
      }
      categoriesMap[cat].push(pres);
    });

    const result = Object.keys(categoriesMap).map(catName => ({
      category: catName,
      presentations: categoriesMap[catName]
    }));

    // Sort categories: "General" always first, others alphabetically
    result.sort((a, b) => {
      if (a.category === 'General') return -1;
      if (b.category === 'General') return 1;
      return a.category.localeCompare(b.category);
    });

    res.json(result);
  } catch (err) {
    console.error('Error reading presentations.json:', err);
    res.status(500).json({ error: 'Failed to read presentations configuration' });
  }
});

function resolvePptxAssetBaseDir(sourcePath) {
  if (typeof sourcePath !== 'string' || !sourcePath.trim()) return '';
  const normalizedSourcePath = sourcePath.trim().replace(/^[/\\]+/, '');
  const candidate = path.resolve(workspaceDir, path.dirname(normalizedSourcePath));
  return isPathWithin(workspaceDir, candidate) ? candidate : '';
}

function normalizePptxDownloadFilename(filename, title = '') {
  const fallback = title || 'slidenext-presentation';
  const baseName = path.basename(typeof filename === 'string' && filename.trim() ? filename : fallback)
    .replace(/\.pptx$/i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+$/, 'slidenext-presentation');
  return `${baseName || 'slidenext-presentation'}.pptx`;
}

function resolveProvidedCanonicalDeck(canonicalDeck) {
  if (canonicalDeck === undefined || canonicalDeck === null) {
    return null;
  }
  return presentationMetadata.resolvePresentationCanonicalDeck({ canonicalDeck });
}

// Export any canonical deck without writing generated files into the workspace.
app.post('/api/export/pptx', async (req, res) => {
  const { canonicalDeck, filename, sourcePath } = req.body || {};
  if (!canonicalDeck || !Array.isArray(canonicalDeck.slides)) {
    return res.status(400).json({ error: 'Missing canonicalDeck' });
  }
  if (canonicalDeck.slides.length === 0) {
    return res.status(400).json({ error: 'Cannot export an empty deck' });
  }

  try {
    const result = canonicalPptxExport.createCanonicalPptxExport(canonicalDeck, {
      assetBaseDir: resolvePptxAssetBaseDir(sourcePath || canonicalDeck.metadata?.sourcePath),
      assetExists(assetSource) {
        if (/^(data:|https?:\/\/)/i.test(assetSource)) return true;
        const resolvedAssetPath = path.resolve(assetSource);
        return isPathWithin(workspaceDir, resolvedAssetPath)
          && fsSync.existsSync(resolvedAssetPath);
      }
    });
    if (!result.pptx || typeof result.pptx.write !== 'function') {
      return res.status(500).json({ error: 'PPTX exporter is unavailable' });
    }

    const buffer = await result.pptx.write({ outputType: 'nodebuffer' });
    const downloadFilename = normalizePptxDownloadFilename(filename, canonicalDeck.metadata?.title);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('X-SlideNext-Pptx-Warning-Count', String(result.diagnostics.warnings.length));
    res.setHeader(
      'X-SlideNext-Pptx-Warning-Details',
      canonicalPptxExport.createPptxWarningDetailsHeader(result.diagnostics.warnings)
    );
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting PPTX:', err);
    return res.status(500).json({ error: `Failed to export PPTX: ${err.message}` });
  }
});

// Helper: Ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function buildVersionBackupFilename(targetFile, versionLabel, now = new Date()) {
  const pad2 = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');
  const yyyymmdd = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const hhmmss = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  const mmm = pad3(now.getMilliseconds());
  const timestamp = `${yyyymmdd}_${hhmmss}_${mmm}`;
  const ext = path.extname(targetFile);
  const base = path.basename(targetFile, ext);
  const labelSuffix = versionLabel ? `_${versionLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
  return `${base}_${timestamp}${labelSuffix}${ext}`;
}

async function createVersionBackupFromContent(targetFile, htmlContent, versionLabel, now = new Date()) {
  const parentDir = path.dirname(targetFile);
  const versionsDir = path.join(parentDir, '.versions');
  await ensureDir(versionsDir);

  const backupFilename = buildVersionBackupFilename(targetFile, versionLabel, now);
  const backupPath = path.join(versionsDir, backupFilename);
  await fs.writeFile(backupPath, htmlContent, 'utf8');
  return backupFilename;
}

async function readPresentationMetadataSidecar(htmlPath) {
  const metadataPath = presentationMetadata.derivePresentationMetadataPath(htmlPath);
  if (!metadataPath) {
    return null;
  }

  const normalizedMetadataPath = metadataPath.replace(/^\//, '');
  const metadataFile = path.resolve(workspaceDir, normalizedMetadataPath);
  if (!isPathWithin(workspaceDir, metadataFile)) {
    return null;
  }

  let metadata = presentationMetadata.buildPresentationMetadataSeed(htmlPath);
  let exists = false;
  try {
    const metadataContent = await fs.readFile(metadataFile, 'utf8');
    metadata = JSON.parse(metadataContent);
    exists = true;
  } catch (metadataErr) {
    if (metadataErr.code !== 'ENOENT') {
      console.warn(`Falling back to generated metadata seed for ${metadataFile}:`, metadataErr.message);
    }
  }

  return {
    metadataPath,
    metadataFile,
    metadata,
    exists
  };
}

async function writePresentationMetadataSidecar(metadataInfo, metadata) {
  if (!metadataInfo || !metadataInfo.metadataFile) {
    return false;
  }
  await fs.writeFile(metadataInfo.metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return true;
}

function derivePresentationMetadataVersionFilename(versionFilename, targetFile, metadataFile) {
  const targetExt = path.extname(targetFile);
  const targetBase = path.basename(targetFile, targetExt);
  const metadataExt = path.extname(metadataFile);
  const metadataBase = path.basename(metadataFile, metadataExt);

  return deriveSiblingVersionBackupFilename(
    versionFilename,
    targetBase,
    targetExt,
    metadataBase,
    metadataExt
  );
}

async function createPresentationMetadataVersionBackup(targetFile, versionFilename, metadataInfo, metadata) {
  if (!metadataInfo || !metadataInfo.metadataFile) {
    return '';
  }

  const metadataVersionFilename = derivePresentationMetadataVersionFilename(
    versionFilename,
    targetFile,
    metadataInfo.metadataFile
  );
  if (!metadataVersionFilename) {
    return '';
  }

  const parentDir = path.dirname(targetFile);
  const versionsDir = path.join(parentDir, '.versions');
  await ensureDir(versionsDir);

  const metadataVersionFile = path.join(versionsDir, metadataVersionFilename);
  await fs.writeFile(metadataVersionFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return metadataVersionFilename;
}

// 2. API: Overwrite index.html and save a timestamped backup in .versions/
app.post('/api/save', async (req, res) => {
  const { htmlPath, htmlContent, isAutoSave, versionLabel, canonicalDeck } = req.body;
  if (!htmlPath || !htmlContent) {
    return res.status(400).json({ error: 'Missing htmlPath or htmlContent' });
  }
  if (canonicalDeck !== undefined && canonicalDeck !== null && !resolveProvidedCanonicalDeck(canonicalDeck)) {
    return res.status(400).json({ error: 'Invalid canonicalDeck' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    
    // Check if target file is within workspace boundaries
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied: outside workspace directory' });
    }

    // Create timestamped backup file if it is NOT an auto-save
    if (!isAutoSave) {
      try {
        const now = new Date();
        const backupFilename = await createVersionBackupFromContent(targetFile, htmlContent, versionLabel, now);
        console.log(`Version backup saved: ${backupFilename}`);

        if (canonicalDeck) {
          const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
          if (metadataInfo) {
            const nextMetadata = presentationMetadata.mergePresentationCanonicalDeck(metadataInfo.metadata, canonicalDeck);
            const nextCanonicalDeck = presentationMetadata.resolvePresentationCanonicalDeck(nextMetadata);
            if (nextCanonicalDeck) {
              const metadataBackupFilename = await createPresentationMetadataVersionBackup(
                targetFile,
                backupFilename,
                metadataInfo,
                nextMetadata
              );
              if (metadataBackupFilename) {
                console.log(`Version metadata backup saved: ${metadataBackupFilename}`);
              }
            }
          }
        }
      } catch (backupErr) {
        console.warn('Failed to create version backup:', backupErr.message);
      }
    }

    // Write new content to the target file
    await fs.writeFile(targetFile, htmlContent, 'utf8');
    console.log(`Saved new content to ${targetFile} (AutoSave: ${!!isAutoSave})`);

    if (canonicalDeck) {
      try {
        const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
        if (metadataInfo) {
          const nextMetadata = presentationMetadata.mergePresentationCanonicalDeck(metadataInfo.metadata, canonicalDeck);
          await writePresentationMetadataSidecar(metadataInfo, nextMetadata);
          console.log(`Updated canonical deck sidecar: ${metadataInfo.metadataFile}`);
        }
      } catch (metadataErr) {
        console.warn('Failed to persist canonical deck sidecar:', metadataErr.message);
      }
    }

    res.json({ success: true, message: 'File saved successfully' });
  } catch (err) {
    console.error('Error saving presentation:', err);
    res.status(500).json({ error: `Failed to save file: ${err.message}` });
  }
});

// 3. API: Create a named checkpoint from the current on-disk file without rewriting it
app.post('/api/versions/create', async (req, res) => {
  const { htmlPath, versionLabel } = req.body;
  if (!htmlPath || !versionLabel) {
    return res.status(400).json({ error: 'Missing htmlPath or versionLabel' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied: outside workspace directory' });
    }

    const htmlContent = await fs.readFile(targetFile, 'utf8');
    const backupFilename = await createVersionBackupFromContent(targetFile, htmlContent, versionLabel);
    console.log(`Version backup saved without rewriting deck: ${backupFilename}`);

    const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
    if (metadataInfo) {
      const currentCanonicalDeck = presentationMetadata.resolvePresentationCanonicalDeck(metadataInfo.metadata);
      if (currentCanonicalDeck) {
        const metadataBackupFilename = await createPresentationMetadataVersionBackup(
          targetFile,
          backupFilename,
          metadataInfo,
          metadataInfo.metadata
        );
        if (metadataBackupFilename) {
          console.log(`Version metadata backup saved without rewriting deck: ${metadataBackupFilename}`);
        }
      }
    }

    res.json({ success: true, backupFilename });
  } catch (err) {
    console.error('Error creating version-only backup:', err);
    res.status(500).json({ error: `Failed to create version backup: ${err.message}` });
  }
});

// 4. API: List version backups for a specific presentation file
app.get('/api/versions', async (req, res) => {
  const { htmlPath } = req.query;
  if (!htmlPath) {
    return res.status(400).json({ error: 'Missing htmlPath parameter' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionsDir = path.join(parentDir, '.versions');

    try {
      const files = await fs.readdir(versionsDir);
      const ext = path.extname(targetFile);
      const base = path.basename(targetFile, ext);
      const backupRegex = buildVersionBackupRegex(base, ext);

      const versions = [];
      for (const file of files) {
        if (backupRegex.test(file)) {
          const filePath = path.join(versionsDir, file);
          const stat = await fs.stat(filePath);
          versions.push({
            filename: file,
            createdAt: stat.mtime
          });
        }
      }

      // Sort by newest first
      versions.sort((a, b) => b.createdAt - a.createdAt);
      res.json(versions);
    } catch (readDirErr) {
      // If versions dir doesn't exist, return empty array
      if (readDirErr.code === 'ENOENT') {
        return res.json([]);
      }
      throw readDirErr;
    }
  } catch (err) {
    console.error('Error reading versions:', err);
    res.status(500).json({ error: `Failed to fetch versions: ${err.message}` });
  }
});

// 4. API: Restore a version backup
app.post('/api/restore', async (req, res) => {
  const { htmlPath, versionFilename } = req.body;
  if (!htmlPath || !versionFilename) {
    return res.status(400).json({ error: 'Missing htmlPath or versionFilename' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    // Validate that the version file is indeed inside the .versions directory
    if (!isPathWithin(path.join(parentDir, '.versions'), versionFilePath)) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    // Overwrite target file with the backup content
    const backupContent = await fs.readFile(versionFilePath, 'utf8');
    await fs.writeFile(targetFile, backupContent, 'utf8');
    console.log(`Restored target file to backup version: ${versionFilename}`);

    try {
      const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
      if (metadataInfo) {
        const metadataVersionFilename = derivePresentationMetadataVersionFilename(
          versionFilename,
          targetFile,
          metadataInfo.metadataFile
        );
        let restoredMetadata = null;

        if (metadataVersionFilename) {
          const metadataVersionFile = path.resolve(parentDir, '.versions', metadataVersionFilename);
          if (isPathWithin(path.join(parentDir, '.versions'), metadataVersionFile)) {
            try {
              const metadataBackupContent = await fs.readFile(metadataVersionFile, 'utf8');
              restoredMetadata = JSON.parse(metadataBackupContent);
            } catch (metadataBackupErr) {
              if (metadataBackupErr.code !== 'ENOENT') {
                console.warn(`Failed to read restored canonical deck sidecar backup ${metadataVersionFile}:`, metadataBackupErr.message);
              }
            }
          }
        }

        if (restoredMetadata && presentationMetadata.resolvePresentationCanonicalDeck(restoredMetadata)) {
          await writePresentationMetadataSidecar(metadataInfo, restoredMetadata);
          console.log(`Restored canonical deck sidecar: ${metadataInfo.metadataFile}`);
        } else {
          const nextMetadata = presentationMetadata.stripPresentationCanonicalDeck(metadataInfo.metadata);
          await writePresentationMetadataSidecar(metadataInfo, nextMetadata);
          console.log(`Cleared restored canonical deck sidecar: ${metadataInfo.metadataFile}`);
        }
      }
    } catch (metadataErr) {
      console.warn('Failed to restore canonical deck sidecar:', metadataErr.message);
    }

    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (err) {
    console.error('Error restoring version:', err);
    res.status(500).json({ error: `Failed to restore version: ${err.message}` });
  }
});

// 5. API: Rename a version backup
app.post('/api/versions/rename', async (req, res) => {
  const { htmlPath, versionFilename, newLabel } = req.body;
  if (!htmlPath || !versionFilename || !newLabel) {
    return res.status(400).json({ error: 'Missing htmlPath, versionFilename, or newLabel' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    if (!isPathWithin(path.join(parentDir, '.versions'), versionFilePath)) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    // Check if source version exists
    try {
      await fs.access(versionFilePath);
    } catch (err) {
      return res.status(404).json({ error: 'Version file not found' });
    }

    const ext = path.extname(targetFile);
    const base = path.basename(targetFile, ext);
    const timestampPart = extractVersionTimestampPrefix(versionFilename, base, ext);
    if (!timestampPart) {
      return res.status(400).json({ error: 'Invalid version filename format' });
    }

    const cleanLabel = newLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newFilename = `${timestampPart}_${cleanLabel}${ext}`;
    const newFilePath = path.resolve(parentDir, '.versions', newFilename);

    await fs.rename(versionFilePath, newFilePath);
    console.log(`Renamed version from ${versionFilename} to ${newFilename}`);

    const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
    if (metadataInfo) {
      const metadataVersionFilename = derivePresentationMetadataVersionFilename(
        versionFilename,
        targetFile,
        metadataInfo.metadataFile
      );
      const newMetadataVersionFilename = derivePresentationMetadataVersionFilename(
        newFilename,
        targetFile,
        metadataInfo.metadataFile
      );
      if (metadataVersionFilename && newMetadataVersionFilename) {
        const metadataVersionFile = path.resolve(parentDir, '.versions', metadataVersionFilename);
        const newMetadataVersionFile = path.resolve(parentDir, '.versions', newMetadataVersionFilename);
        if (
          isPathWithin(path.join(parentDir, '.versions'), metadataVersionFile) &&
          isPathWithin(path.join(parentDir, '.versions'), newMetadataVersionFile)
        ) {
          try {
            await fs.rename(metadataVersionFile, newMetadataVersionFile);
            console.log(`Renamed version metadata from ${metadataVersionFilename} to ${newMetadataVersionFilename}`);
          } catch (metadataRenameErr) {
            if (metadataRenameErr.code !== 'ENOENT') {
              throw metadataRenameErr;
            }
          }
        }
      }
    }

    res.json({ success: true, newFilename });
  } catch (err) {
    console.error('Error renaming version:', err);
    res.status(500).json({ error: `Failed to rename version: ${err.message}` });
  }
});

// 6. API: Delete a version backup
app.post('/api/versions/delete', async (req, res) => {
  const { htmlPath, versionFilename } = req.body;
  if (!htmlPath || !versionFilename) {
    return res.status(400).json({ error: 'Missing htmlPath or versionFilename' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    if (!isPathWithin(path.join(parentDir, '.versions'), versionFilePath)) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    await fs.unlink(versionFilePath);
    console.log(`Deleted version backup: ${versionFilename}`);

    const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
    if (metadataInfo) {
      const metadataVersionFilename = derivePresentationMetadataVersionFilename(
        versionFilename,
        targetFile,
        metadataInfo.metadataFile
      );
      if (metadataVersionFilename) {
        const metadataVersionFile = path.resolve(parentDir, '.versions', metadataVersionFilename);
        if (isPathWithin(path.join(parentDir, '.versions'), metadataVersionFile)) {
          try {
            await fs.unlink(metadataVersionFile);
            console.log(`Deleted version metadata backup: ${metadataVersionFilename}`);
          } catch (metadataDeleteErr) {
            if (metadataDeleteErr.code !== 'ENOENT') {
              throw metadataDeleteErr;
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting version:', err);
    res.status(500).json({ error: `Failed to delete version: ${err.message}` });
  }
});

// Listen on all network interfaces inside Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` SlideNext backend server running locally`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Workspace root: ${workspaceDir}`);
  console.log(`====================================================`);
});
