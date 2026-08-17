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
const presentationCreation = require('./shared/presentation-creation');
const deckHtml = require('./shared/deck-html');
const canonicalPptxExport = require('./shared/canonical-pptx-export');
const canonicalPdfExport = require('./scripts/export-canonical-pdf');
const legacyPptxExport = require('./scripts/export-legacy-html-pptx');
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

// Create a new blank canonical deck and add it to the local presentation library.
app.post('/api/presentations/create', async (req, res) => {
  const title = req.body && req.body.title;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Missing presentation title' });
  }

  const presentationsDir = path.join(workspaceDir, 'presentations');
  const configPath = path.join(presentationsDir, 'presentations.json');
  let createdFolderPath = '';
  let createdFolder = false;
  let temporaryConfigPath = '';

  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    const libraryEntries = JSON.parse(configContent);
    if (!Array.isArray(libraryEntries)) {
      throw new Error('Presentations configuration must be an array');
    }

    const existingSlugs = libraryEntries
      .map((entry) => entry && entry.folder)
      .filter((folder) => typeof folder === 'string' && folder.trim());
    const presentationDirectories = await fs.readdir(presentationsDir, { withFileTypes: true });
    presentationDirectories
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => existingSlugs.push(entry.name));

    const artifacts = presentationCreation.buildBlankPresentationArtifacts({
      title: title.trim(),
      existingSlugs
    });
    if (!artifacts) {
      throw new Error('Blank presentation factory is unavailable');
    }

    createdFolderPath = path.resolve(workspaceDir, 'presentations', artifacts.folder);
    if (!isPathWithin(presentationsDir, createdFolderPath)) {
      return res.status(403).json({ error: 'Access denied: invalid presentation path' });
    }

    await fs.mkdir(createdFolderPath);
    createdFolder = true;
    const htmlFile = path.join(createdFolderPath, 'index.html');
    const metadataFile = path.join(createdFolderPath, 'presentation.json');
    await fs.writeFile(htmlFile, artifacts.html, { encoding: 'utf8', flag: 'wx' });
    await fs.writeFile(metadataFile, `${JSON.stringify(artifacts.metadata, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });

    temporaryConfigPath = path.join(
      presentationsDir,
      `.presentations-${process.pid}-${Date.now()}-${artifacts.folder}.tmp`
    );
    await fs.writeFile(
      temporaryConfigPath,
      `${JSON.stringify([...libraryEntries, artifacts.libraryEntry], null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' }
    );
    await fs.rename(temporaryConfigPath, configPath);
    temporaryConfigPath = '';

    const relativePath = `presentations/${artifacts.folder}/index.html`;
    return res.status(201).json({
      success: true,
      presentation: {
        ...artifacts.libraryEntry,
        url: relativePath,
        relativePath,
        category: artifacts.libraryEntry.category || 'General'
      }
    });
  } catch (err) {
    if (temporaryConfigPath) {
      await fs.rm(temporaryConfigPath, { force: true }).catch(() => {});
    }
    if (createdFolder && createdFolderPath) {
      await fs.rm(createdFolderPath, { recursive: true, force: true }).catch(() => {});
    }
    if (err.code === 'EEXIST') {
      return res.status(409).json({ error: 'A presentation with that name already exists' });
    }
    console.error('Error creating presentation:', err);
    return res.status(500).json({ error: `Failed to create presentation: ${err.message}` });
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

function normalizePdfDownloadFilename(filename, title = '') {
  const fallback = title || 'slidenext-presentation';
  const baseName = path.basename(typeof filename === 'string' && filename.trim() ? filename : fallback)
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+$/, 'slidenext-presentation');
  return `${baseName || 'slidenext-presentation'}.pdf`;
}

function resolveProvidedCanonicalDeck(canonicalDeck) {
  if (canonicalDeck === undefined || canonicalDeck === null) {
    return null;
  }
  return presentationMetadata.resolvePresentationCanonicalDeck({ canonicalDeck });
}

async function resolveExportCanonicalDeck(canonicalDeck, sourcePath = '') {
  const providedDeck = resolveProvidedCanonicalDeck(canonicalDeck);
  if (providedDeck || (canonicalDeck !== undefined && canonicalDeck !== null)) {
    return providedDeck;
  }

  const metadataPath = presentationMetadata.derivePresentationMetadataPath(sourcePath);
  if (!metadataPath) return null;

  const metadataFile = path.resolve(workspaceDir, metadataPath.replace(/^[/\\]+/, ''));
  if (!isPathWithin(workspaceDir, metadataFile)) return null;

  try {
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    return presentationMetadata.resolvePresentationCanonicalDeck(metadata);
  } catch (err) {
    return null;
  }
}

// Export any canonical deck without writing generated files into the workspace.
app.post('/api/export/pptx', async (req, res) => {
  const { canonicalDeck, filename, sourcePath } = req.body || {};
  const resolvedCanonicalDeck = await resolveExportCanonicalDeck(canonicalDeck, sourcePath);
  if (!resolvedCanonicalDeck) {
    const legacySourcePath = canonicalPdfExport.resolveLegacyHtmlSourcePath(sourcePath);
    if (!legacySourcePath) {
      return res.status(400).json({ error: 'Invalid canonicalDeck' });
    }

    try {
      const legacyHtml = await fs.readFile(legacySourcePath, 'utf8');
      const result = await legacyPptxExport.exportLegacyHtmlToPptx(legacyHtml, {
        assetBaseDir: path.dirname(legacySourcePath)
      });
      const buffer = result.buffer;
      canonicalPptxExport.validatePptxArtifact(buffer, result.slideCount);
      const downloadFilename = normalizePptxDownloadFilename(filename);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('X-SlideNext-Pptx-Warning-Count', String(result.warnings.length));
      res.setHeader(
        'X-SlideNext-Pptx-Warning-Details',
        canonicalPptxExport.createPptxWarningDetailsHeader(result.warnings)
      );
      return res.send(buffer);
    } catch (err) {
      console.error('Error exporting legacy PPTX:', err);
      return res.status(500).json({ error: `Failed to export PPTX: ${err.message}` });
    }
  }
  if (resolvedCanonicalDeck.slides.length === 0) {
    return res.status(400).json({ error: 'Cannot export an empty deck' });
  }

  try {
    const result = canonicalPptxExport.createCanonicalPptxExport(resolvedCanonicalDeck, {
      assetBaseDir: resolvePptxAssetBaseDir(sourcePath || resolvedCanonicalDeck.metadata?.sourcePath),
      assetRootDir: workspaceDir,
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
    canonicalPptxExport.validatePptxArtifact(buffer, resolvedCanonicalDeck.slides.length);
    const downloadFilename = normalizePptxDownloadFilename(filename, resolvedCanonicalDeck.metadata?.title);
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

app.post('/api/export/pdf', async (req, res) => {
  const { canonicalDeck, filename, sourcePath } = req.body || {};
  const resolvedCanonicalDeck = await resolveExportCanonicalDeck(canonicalDeck, sourcePath);
  if (!resolvedCanonicalDeck) {
    const legacySourcePath = canonicalPdfExport.resolveLegacyHtmlSourcePath(sourcePath);
    if (!legacySourcePath) {
      return res.status(400).json({ error: 'Invalid canonicalDeck' });
    }

    try {
      const legacyHtml = await fs.readFile(legacySourcePath, 'utf8');
      const preflight = canonicalPdfExport.preflightLegacyPdfExport(legacyHtml, {
        assetBaseDir: path.dirname(legacySourcePath),
        assetRootDir: workspaceDir
      });
      const buffer = await canonicalPdfExport.exportLegacyPdfBuffer(legacyHtml, {
        assetBaseDir: path.dirname(legacySourcePath)
      });
      const downloadFilename = normalizePdfDownloadFilename(filename);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('X-SlideNext-Pdf-Warning-Count', String(preflight.warnings.length));
      res.setHeader(
        'X-SlideNext-Pdf-Warning-Details',
        canonicalPdfExport.createStudioPdfWarningDetailsHeader(preflight.warnings)
      );
      return res.send(buffer);
    } catch (err) {
      console.error('Error exporting legacy PDF:', err);
      return res.status(500).json({ error: `Failed to export PDF: ${err.message}` });
    }
  }
  if (resolvedCanonicalDeck.slides.length === 0) {
    return res.status(400).json({ error: 'Cannot export an empty deck' });
  }

  const assetBaseDir = resolvePptxAssetBaseDir(
    sourcePath || resolvedCanonicalDeck.metadata?.sourcePath
  );
  const preflight = canonicalPdfExport.preflightStudioPdfExport(resolvedCanonicalDeck, {
    assetExists: canonicalPdfExport.createPdfAssetExists(assetBaseDir, workspaceDir)
  });
  try {
    const buffer = await canonicalPdfExport.exportCanonicalPdfBuffer(resolvedCanonicalDeck, {
      assetBaseDir
    });
    const downloadFilename = normalizePdfDownloadFilename(filename, resolvedCanonicalDeck.metadata?.title);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('X-SlideNext-Pdf-Warning-Count', String(preflight.warnings.length));
    res.setHeader(
      'X-SlideNext-Pdf-Warning-Details',
      canonicalPdfExport.createStudioPdfWarningDetailsHeader(preflight.warnings)
    );
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    return res.status(500).json({ error: `Failed to export PDF: ${err.message}` });
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

async function writeFileAtomically(targetFile, content) {
  const temporaryFile = `${targetFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await fs.writeFile(temporaryFile, content, 'utf8');
    await fs.rename(temporaryFile, targetFile);
  } finally {
    await fs.rm(temporaryFile, { force: true }).catch(() => {});
  }
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
  await writeFileAtomically(metadataInfo.metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
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

function applyPresentationCanonicalDeckUpdate(metadata, canonicalDeck) {
  return canonicalDeck === null
    ? presentationMetadata.stripPresentationCanonicalDeck(metadata)
    : presentationMetadata.mergePresentationCanonicalDeck(metadata, canonicalDeck);
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

async function createVersionBackupPair({
  targetFile,
  htmlContent,
  versionLabel,
  metadataInfo,
  metadata,
  now = new Date(),
  createHtmlBackup = createVersionBackupFromContent,
  createMetadataBackup = createPresentationMetadataVersionBackup,
  removeBackup = (backupPath) => fs.unlink(backupPath)
}) {
  const backupFilename = await createHtmlBackup(targetFile, htmlContent, versionLabel, now);

  try {
    let metadataBackupFilename = '';
    if (metadataInfo && metadata !== undefined) {
      metadataBackupFilename = await createMetadataBackup(
        targetFile,
        backupFilename,
        metadataInfo,
        metadata
      );
    }
    return { backupFilename, metadataBackupFilename };
  } catch (err) {
    const versionsDir = path.resolve(path.dirname(targetFile), '.versions');
    const backupPath = path.resolve(versionsDir, backupFilename);
    if (isPathWithin(versionsDir, backupPath)) {
      try {
        await removeBackup(backupPath);
        console.warn(`Removed partial version backup after metadata failure: ${backupPath}`);
      } catch (rollbackErr) {
        console.warn('Failed to remove partial version backup:', rollbackErr.message);
      }
    }
    throw err;
  }
}

// 2. API: Overwrite index.html and save a timestamped backup in .versions/
app.post('/api/save', async (req, res) => {
  const requestBody = req.body || {};
  const { htmlPath, htmlContent, isAutoSave, versionLabel, canonicalDeck } = requestBody;
  const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(requestBody, 'canonicalDeck');
  const resolvedCanonicalDeck = hasCanonicalDeck && canonicalDeck !== null
    ? resolveProvidedCanonicalDeck(canonicalDeck)
    : null;
  if (hasCanonicalDeck && canonicalDeck !== null && !resolvedCanonicalDeck) {
    return res.status(400).json({ error: 'Invalid canonicalDeck' });
  }
  const resolvedHtmlContent = htmlContent
    || (resolvedCanonicalDeck ? deckHtml.buildDeckSourceHtml(resolvedCanonicalDeck) : '');
  if (!htmlPath || !resolvedHtmlContent) {
    return res.status(400).json({ error: 'Missing htmlPath or htmlContent' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    
    // Check if target file is within workspace boundaries
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied: outside workspace directory' });
    }

    let previousHtmlContent = null;
    if (hasCanonicalDeck) {
      try {
        previousHtmlContent = await fs.readFile(targetFile, 'utf8');
      } catch (readErr) {
        console.warn('Failed to capture the previous HTML before canonical save:', readErr.message);
      }
    }

    // Create timestamped backup file if it is NOT an auto-save
    if (!isAutoSave) {
      try {
        const now = new Date();
        const metadataInfo = hasCanonicalDeck
          ? await readPresentationMetadataSidecar(htmlPath)
          : null;
        let backupMetadataInfo = null;
        let backupMetadata;
        if (metadataInfo) {
          const nextMetadata = applyPresentationCanonicalDeckUpdate(metadataInfo.metadata, canonicalDeck);
          const nextCanonicalDeck = presentationMetadata.resolvePresentationCanonicalDeck(nextMetadata);
          if (nextCanonicalDeck || canonicalDeck === null) {
            backupMetadataInfo = metadataInfo;
            backupMetadata = nextMetadata;
          }
        }

        const { backupFilename, metadataBackupFilename } = await createVersionBackupPair({
          targetFile,
          htmlContent: resolvedHtmlContent,
          versionLabel,
          now,
          metadataInfo: backupMetadataInfo,
          metadata: backupMetadata
        });
        console.log(`Version backup saved: ${backupFilename}`);
        if (metadataBackupFilename) {
          console.log(`Version metadata backup saved: ${metadataBackupFilename}`);
        }
      } catch (backupErr) {
        console.warn('Failed to create version backup:', backupErr.message);
      }
    }

    // Write new content to the target file
    await writeFileAtomically(targetFile, resolvedHtmlContent);
    console.log(`Saved new content to ${targetFile} (AutoSave: ${!!isAutoSave})`);

    let canonicalDeckPersistenceError = null;
    if (hasCanonicalDeck) {
      try {
        const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
        if (metadataInfo) {
          const nextMetadata = applyPresentationCanonicalDeckUpdate(metadataInfo.metadata, canonicalDeck);
          await writePresentationMetadataSidecar(metadataInfo, nextMetadata);
          console.log(`Updated canonical deck sidecar: ${metadataInfo.metadataFile}`);
        }
      } catch (metadataErr) {
        canonicalDeckPersistenceError = metadataErr;
        console.warn('Failed to persist canonical deck sidecar:', metadataErr.message);
      }
    }

    if (canonicalDeckPersistenceError) {
      let didRestoreHtml = false;
      if (previousHtmlContent !== null) {
        try {
          await writeFileAtomically(targetFile, previousHtmlContent);
          didRestoreHtml = true;
          console.warn(`Restored previous HTML after canonical sidecar failure: ${targetFile}`);
        } catch (restoreErr) {
          console.warn('Failed to restore previous HTML after canonical sidecar failure:', restoreErr.message);
        }
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to persist canonical deck sidecar',
        htmlSaved: !didRestoreHtml
      });
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
    const metadataInfo = await readPresentationMetadataSidecar(htmlPath);
    const currentCanonicalDeck = metadataInfo
      ? presentationMetadata.resolvePresentationCanonicalDeck(metadataInfo.metadata)
      : null;
    const { backupFilename, metadataBackupFilename } = await createVersionBackupPair({
      targetFile,
      htmlContent,
      versionLabel,
      metadataInfo: currentCanonicalDeck ? metadataInfo : null,
      metadata: currentCanonicalDeck ? metadataInfo.metadata : undefined
    });
    console.log(`Version backup saved without rewriting deck: ${backupFilename}`);
    if (metadataBackupFilename) {
      console.log(`Version metadata backup saved without rewriting deck: ${metadataBackupFilename}`);
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

    let previousHtmlContent = null;
    try {
      previousHtmlContent = await fs.readFile(targetFile, 'utf8');
    } catch (readErr) {
      console.warn('Failed to capture the current HTML before version restore:', readErr.message);
    }

    // Overwrite target file with the backup content
    const backupContent = await fs.readFile(versionFilePath, 'utf8');
    await writeFileAtomically(targetFile, backupContent);
    console.log(`Restored target file to backup version: ${versionFilename}`);

    let canonicalSidecarPersistenceError = null;
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
      canonicalSidecarPersistenceError = metadataErr;
      console.warn('Failed to restore canonical deck sidecar:', metadataErr.message);
    }

    if (canonicalSidecarPersistenceError) {
      let didRestorePreviousHtml = false;
      if (previousHtmlContent !== null) {
        try {
          await writeFileAtomically(targetFile, previousHtmlContent);
          didRestorePreviousHtml = true;
          console.warn(`Restored current HTML after canonical sidecar failure: ${targetFile}`);
        } catch (restoreErr) {
          console.warn('Failed to restore current HTML after canonical sidecar failure:', restoreErr.message);
        }
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to restore canonical deck sidecar',
        htmlRestored: !didRestorePreviousHtml
      });
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

  let renamedVersionFile = null;
  let renamedMetadataVersionFile = null;
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
    renamedVersionFile = {
      source: versionFilePath,
      target: newFilePath
    };
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
            renamedMetadataVersionFile = {
              source: metadataVersionFile,
              target: newMetadataVersionFile
            };
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
    if (renamedMetadataVersionFile) {
      try {
        await fs.rename(renamedMetadataVersionFile.target, renamedMetadataVersionFile.source);
      } catch (rollbackErr) {
        console.warn('Failed to roll back renamed version metadata:', rollbackErr.message);
      }
    }
    if (renamedVersionFile) {
      try {
        await fs.rename(renamedVersionFile.target, renamedVersionFile.source);
      } catch (rollbackErr) {
        console.warn('Failed to roll back renamed version:', rollbackErr.message);
      }
    }
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

  let deletedVersionContent = null;
  let didDeleteVersionFile = false;
  let deletedVersionPath = '';
  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!isPathWithin(workspaceDir, targetFile)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);
    deletedVersionPath = versionFilePath;

    if (!isPathWithin(path.join(parentDir, '.versions'), versionFilePath)) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    deletedVersionContent = await fs.readFile(versionFilePath, 'utf8');
    await fs.unlink(versionFilePath);
    didDeleteVersionFile = true;
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
    if (didDeleteVersionFile && deletedVersionContent !== null) {
      try {
        await writeFileAtomically(deletedVersionPath, deletedVersionContent);
        console.warn(`Restored deleted version after metadata failure: ${deletedVersionPath}`);
      } catch (rollbackErr) {
        console.warn('Failed to roll back deleted version:', rollbackErr.message);
      }
    }
    console.error('Error deleting version:', err);
    res.status(500).json({ error: `Failed to delete version: ${err.message}` });
  }
});

if (require.main === module) {
  // Listen on all network interfaces inside Docker.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` SlideNext backend server running locally`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Workspace root: ${workspaceDir}`);
    console.log(`====================================================`);
  });
}

module.exports = {
  app,
  PORT,
  workspaceDir,
  createVersionBackupPair
};
