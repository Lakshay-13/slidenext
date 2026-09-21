const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const pdfExport = require('./export-canonical-pdf.js');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');

function toWorkspaceUrl(filePath, workspaceRoot = WORKSPACE_ROOT) {
  const relativePath = path.relative(workspaceRoot, path.resolve(filePath));
  if (!relativePath || relativePath.startsWith('..' + path.sep) || path.isAbsolute(relativePath)) {
    throw new Error('HTML deck must be inside the SlideNext workspace for editable PPTX export');
  }
  return `/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

function buildCanonicalImportHarnessHtml(deckPath) {
  const serializedDeckPath = JSON.stringify(deckPath);
  return `<!doctype html>
<html><body>
<pre id="canonical-deck-output"></pre>
<iframe id="canonical-deck-frame" src=${JSON.stringify(deckPath)} style="width:1920px;height:1080px;border:0"></iframe>
<script src="/shared/canonical-deck.js"></script>
<script src="/shared/image-position.js"></script>
<script src="/shared/deck-persistence.js"></script>
<script src="/shared/deck-import.js"></script>
<script>
  const frame = document.getElementById('canonical-deck-frame');
  frame.addEventListener('load', () => {
    try {
      const importedDeck = SlideNextDeckImport.importHtmlDeckToCanonicalDeck(
        frame.contentDocument,
        { sourcePath: ${serializedDeckPath} }
      );
      document.getElementById('canonical-deck-output').textContent = JSON.stringify(importedDeck);
      document.documentElement.dataset.canonicalImportReady = 'true';
    } catch (error) {
      document.getElementById('canonical-deck-output').textContent = JSON.stringify({
        error: error && error.message ? error.message : String(error)
      });
      document.documentElement.dataset.canonicalImportReady = 'error';
    }
  });
</script>
</body></html>`;
}

async function runChromeDumpDom(url, options = {}) {
  const chromePath = pdfExport.resolveChromeExecutable(options);
  if (!chromePath) {
    throw new Error('Google Chrome or Chromium is required for editable HTML deck import');
  }
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-import-'));
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1000, options.timeoutMs) : 60000;
  const virtualTimeBudgetMs = Number.isFinite(options.virtualTimeBudgetMs)
    ? Math.max(0, options.virtualTimeBudgetMs)
    : 2000;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    ...(typeof process.getuid === 'function' && process.getuid() === 0
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : []),
    `--user-data-dir=${profileDir}`,
    `--virtual-time-budget=${virtualTimeBudgetMs}`,
    '--dump-dom',
    url
  ];

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(chromePath, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let timeout = null;
      let settled = false;
      const terminate = () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch (error) {
          try { child.kill('SIGTERM'); } catch (killError) { /* already exited */ }
        }
      };
      const parseOutput = () => {
        const outputMatch = stdout.match(/<pre id="canonical-deck-output">([\s\S]*?)<\/pre>/i);
        if (!outputMatch) return null;
        const outputText = outputMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        try { return JSON.parse(outputText); } catch (error) { return null; }
      };
      const finishIfReady = () => {
        if (settled || !/data-canonical-import-ready="(?:true|error)"/i.test(stdout)) return false;
        const importedDeck = parseOutput();
        if (!importedDeck) return false;
        settled = true;
        clearTimeout(timeout);
        terminate();
        if (importedDeck.error) reject(new Error(`Canonical deck import failed: ${importedDeck.error}`));
        else resolve(importedDeck);
        return true;
      };
      timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        terminate();
        reject(new Error('Chrome canonical deck import timed out'));
      }, timeoutMs);
      child.stdout.on('data', chunk => { stdout += chunk; finishIfReady(); });
      child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-4000); });
      child.once('error', error => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        terminate();
        reject(error);
      });
      child.once('exit', (code, signal) => {
        if (settled) return;
        clearTimeout(timeout);
        if (finishIfReady()) return;
        settled = true;
        reject(new Error(code !== 0
          ? `Chrome canonical deck import exited with ${code || signal}: ${stderr.trim()}`
          : 'Chrome canonical deck import produced no ready payload'));
      });
    });
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

async function importHtmlDeckToCanonicalDeck(htmlPath, options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot || WORKSPACE_ROOT);
  const resolvedHtmlPath = path.resolve(htmlPath);
  let deckPath = '';
  let sourceHtmlPath = '';
  try {
    deckPath = toWorkspaceUrl(resolvedHtmlPath, workspaceRoot);
  } catch (error) {
    deckPath = '/__slidenext_deck__.html';
    sourceHtmlPath = resolvedHtmlPath;
  }
  const exportServer = await pdfExport.startExportServer(
    buildCanonicalImportHarnessHtml(deckPath),
    sourceHtmlPath ? path.dirname(sourceHtmlPath) : workspaceRoot,
    sourceHtmlPath ? { deckHtmlPath: sourceHtmlPath } : {}
  );
  try {
    return await runChromeDumpDom(exportServer.url, options);
  } finally {
    await pdfExport.closeExportServer(exportServer.server, exportServer.temporaryDir);
  }
}

module.exports = {
  WORKSPACE_ROOT,
  buildCanonicalImportHarnessHtml,
  runChromeDumpDom,
  importHtmlDeckToCanonicalDeck
};
