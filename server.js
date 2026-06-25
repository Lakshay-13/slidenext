const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const {
  buildVersionBackupRegex,
  extractVersionTimestampPrefix
} = require('./shared/version-backup-utils');

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

// Helper: Ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// 2. API: Overwrite index.html and save a timestamped backup in .versions/
app.post('/api/save', async (req, res) => {
  const { htmlPath, htmlContent, isAutoSave, versionLabel } = req.body;
  if (!htmlPath || !htmlContent) {
    return res.status(400).json({ error: 'Missing htmlPath or htmlContent' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    
    // Check if target file is within workspace boundaries
    if (!targetFile.startsWith(workspaceDir)) {
      return res.status(403).json({ error: 'Access denied: outside workspace directory' });
    }

    const parentDir = path.dirname(targetFile);
    const versionsDir = path.join(parentDir, '.versions');
    await ensureDir(versionsDir);

    // Create timestamped backup file if it is NOT an auto-save
    if (!isAutoSave) {
      try {
        const now = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        const pad3 = (n) => String(n).padStart(3, '0');
        const yyyymmdd = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
        const hhmmss = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
        const mmm = pad3(now.getMilliseconds());
        const timestamp = `${yyyymmdd}_${hhmmss}_${mmm}`;
        
        const ext = path.extname(targetFile);
        const base = path.basename(targetFile, ext);
        const labelSuffix = versionLabel ? `_${versionLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
        const backupFilename = `${base}_${timestamp}${labelSuffix}${ext}`;
        const backupPath = path.join(versionsDir, backupFilename);
        
        await fs.writeFile(backupPath, htmlContent, 'utf8');
        console.log(`Version backup saved: ${backupFilename}`);
      } catch (backupErr) {
        console.warn('Failed to create version backup:', backupErr.message);
      }
    }

    // Write new content to the target file
    await fs.writeFile(targetFile, htmlContent, 'utf8');
    console.log(`Saved new content to ${targetFile} (AutoSave: ${!!isAutoSave})`);

    res.json({ success: true, message: 'File saved successfully' });
  } catch (err) {
    console.error('Error saving presentation:', err);
    res.status(500).json({ error: `Failed to save file: ${err.message}` });
  }
});

// 3. API: List version backups for a specific presentation file
app.get('/api/versions', async (req, res) => {
  const { htmlPath } = req.query;
  if (!htmlPath) {
    return res.status(400).json({ error: 'Missing htmlPath parameter' });
  }

  try {
    const targetFile = path.resolve(workspaceDir, htmlPath);
    if (!targetFile.startsWith(workspaceDir)) {
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
    if (!targetFile.startsWith(workspaceDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    // Validate that the version file is indeed inside the .versions directory
    if (!versionFilePath.startsWith(path.join(parentDir, '.versions'))) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    // Overwrite target file with the backup content
    const backupContent = await fs.readFile(versionFilePath, 'utf8');
    await fs.writeFile(targetFile, backupContent, 'utf8');
    console.log(`Restored target file to backup version: ${versionFilename}`);

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
    if (!targetFile.startsWith(workspaceDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    if (!versionFilePath.startsWith(path.join(parentDir, '.versions'))) {
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
    if (!targetFile.startsWith(workspaceDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetFile);
    const versionFilePath = path.resolve(parentDir, '.versions', versionFilename);

    if (!versionFilePath.startsWith(path.join(parentDir, '.versions'))) {
      return res.status(403).json({ error: 'Access denied: invalid backup path' });
    }

    await fs.unlink(versionFilePath);
    console.log(`Deleted version backup: ${versionFilename}`);

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
