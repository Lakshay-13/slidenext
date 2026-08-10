#!/usr/bin/env node

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const canonicalDeck = require('../shared/canonical-deck.js');
const deckRender = require('../shared/deck-render.js');
const pdfExport = require('../shared/studio-pdf-export.js');
const presentationMetadata = require('../shared/presentation-metadata.js');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CHROME_TIMEOUT_MS = 60000;
const DEFAULT_VIRTUAL_TIME_BUDGET_MS = 1000;

function printUsage() {
  console.error('Usage: node scripts/export-canonical-pdf.js <canonical-deck.json> <output.pdf>');
}

function resolveChromeExecutable(options = {}) {
  const candidates = [
    options.chromePath,
    process.env.SLIDENEXT_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome Beta',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());

  return candidates.find((candidate) => {
    try {
      fsSync.accessSync(candidate, fsSync.constants.X_OK);
      return true;
    } catch (error) {
      return false;
    }
  }) || '';
}

function resolveCanonicalDeck(input) {
  const resolvedFromMetadata = presentationMetadata.resolvePresentationCanonicalDeck(input);
  const rawDeck = input && input.canonicalDeck && typeof input.canonicalDeck === 'object'
    ? input.canonicalDeck
    : input;
  const resolvedDeck = resolvedFromMetadata
    || (rawDeck && Array.isArray(rawDeck.slides) ? canonicalDeck.createCanonicalDeck(rawDeck) : null);
  if (!canonicalDeck.isCanonicalDeck(resolvedDeck)) {
    throw new Error('Input is not a valid canonical deck');
  }
  if (!Array.isArray(resolvedDeck.slides) || resolvedDeck.slides.length === 0) {
    throw new Error('Cannot export an empty deck');
  }
  return resolvedDeck;
}

function buildCanonicalPdfHtml(deck, baseHref = '') {
  const renderedHtml = deckRender.renderCanonicalDeckHtml(deck, {
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
  const pageDimensions = pdfExport.resolveStudioPdfPageDimensions(deck);
  return pdfExport.buildStudioPdfPrintHtml(renderedHtml, {
    ...pageDimensions,
    baseHref,
    slideCount: deck.slides.length
  });
}

function normalizeRequestPath(requestPath) {
  try {
    const pathname = decodeURIComponent(requestPath || '/');
    return pathname.split('?')[0].split('#')[0];
  } catch (error) {
    return '';
  }
}

function resolveContainedPath(rootDir, relativePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolvedPath);
  return relative && (relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    ? null
    : resolvedPath;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  }[extension] || 'application/octet-stream';
}

async function serveFile(response, filePath) {
  try {
    const fileStat = await fs.stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Content-Length': fileStat.size,
      'Cache-Control': 'no-store'
    });
    fsSync.createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end();
  }
}

async function startExportServer(html, assetBaseDir) {
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-pdf-'));
  const exportHtmlPath = path.join(temporaryDir, 'index.html');
  await fs.writeFile(exportHtmlPath, html, 'utf8');

  const server = http.createServer((request, response) => {
    const requestPath = normalizeRequestPath(request.url);
    if (requestPath === '/__slidenext_export__.html') {
      serveFile(response, exportHtmlPath);
      return;
    }

    if (requestPath.startsWith('/__slidenext_assets__/')) {
      const assetPath = resolveContainedPath(
        assetBaseDir,
        requestPath.slice('/__slidenext_assets__/'.length)
      );
      if (!assetPath) {
        response.writeHead(403);
        response.end();
        return;
      }
      serveFile(response, assetPath);
      return;
    }

    const workspacePath = resolveContainedPath(WORKSPACE_ROOT, requestPath.replace(/^\/+/, ''));
    if (!workspacePath) {
      response.writeHead(403);
      response.end();
      return;
    }
    serveFile(response, workspacePath);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  if (!port) {
    await closeExportServer(server, temporaryDir);
    throw new Error('Could not start the temporary PDF asset server');
  }

  return {
    server,
    temporaryDir,
    url: `http://127.0.0.1:${port}/__slidenext_export__.html`,
    assetBaseUrl: `http://127.0.0.1:${port}/__slidenext_assets__/`
  };
}

async function closeExportServer(server, temporaryDir) {
  if (server) {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(() => resolve()));
  }
  if (temporaryDir) {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
}

async function runChromePdfExport(url, outputPath, options = {}) {
  const chromePath = resolveChromeExecutable(options);
  if (!chromePath) {
    throw new Error('Google Chrome or Chromium is required for PDF export');
  }

  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-chrome-'));
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1000, options.timeoutMs)
    : DEFAULT_CHROME_TIMEOUT_MS;
  const virtualTimeBudgetMs = Number.isFinite(options.virtualTimeBudgetMs)
    ? Math.max(0, options.virtualTimeBudgetMs)
    : DEFAULT_VIRTUAL_TIME_BUDGET_MS;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-pdf-header-footer',
    `--user-data-dir=${profileDir}`,
    `--virtual-time-budget=${virtualTimeBudgetMs}`,
    `--print-to-pdf=${outputPath}`,
    url
  ];
  let chromeProcess = null;

  const terminateChromeProcess = () => {
    if (!chromeProcess || !chromeProcess.pid) return;
    try {
      process.kill(-chromeProcess.pid, 'SIGTERM');
    } catch (error) {
      try {
        chromeProcess.kill('SIGTERM');
      } catch (killError) {
        // The process may already have exited.
      }
    }
  };

  try {
    const pdfBuffer = await new Promise((resolve, reject) => {
      chromeProcess = spawn(chromePath, args, {
        detached: true,
        stdio: ['ignore', 'ignore', 'pipe']
      });
      let stderr = '';
      let lastSize = -1;
      let stablePolls = 0;
      let settled = false;
      let pollTimer = null;
      let timeoutTimer = null;

      const cleanup = () => {
        if (pollTimer) clearInterval(pollTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        pollTimer = null;
        timeoutTimer = null;
      };

      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const inspectArtifact = async () => {
        if (settled) return;
        try {
          const fileStat = await fs.stat(outputPath);
          if (!(fileStat.size > 5)) return;
          if (fileStat.size === lastSize) {
            stablePolls += 1;
          } else {
            lastSize = fileStat.size;
            stablePolls = 0;
          }
          if (stablePolls < 2) return;
          const nextPdfBuffer = await fs.readFile(outputPath);
          if (nextPdfBuffer.subarray(0, 5).toString() !== '%PDF-') {
            fail(new Error('Chrome did not produce a valid PDF artifact'));
            return;
          }
          settled = true;
          cleanup();
          resolve(nextPdfBuffer);
        } catch (error) {
          if (error.code !== 'ENOENT') fail(error);
        }
      };

      chromeProcess.stderr.on('data', (chunk) => {
        stderr = `${stderr}${chunk}`.slice(-4000);
      });
      chromeProcess.once('error', fail);
      chromeProcess.once('exit', (code, signal) => {
        inspectArtifact().then(() => {
          if (!settled) {
            const detail = stderr.trim() ? `: ${stderr.trim()}` : '';
            fail(new Error(`Chrome PDF export exited before producing a valid artifact${detail}`));
          }
        }).catch(fail);
      });
      pollTimer = setInterval(() => {
        inspectArtifact().catch(fail);
      }, 100);
      timeoutTimer = setTimeout(() => {
        fail(new Error('Chrome PDF export timed out'));
      }, timeoutMs);
      inspectArtifact().catch(fail);
    });
    return pdfBuffer;
  } finally {
    terminateChromeProcess();
    try {
      await fs.rm(profileDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100
      });
    } catch (error) {
      // Chrome helper processes can release profile files shortly after termination.
    }
  }
}

async function main(argv = process.argv.slice(2), options = {}) {
  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) {
    printUsage();
    return 2;
  }

  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const input = JSON.parse(await fs.readFile(resolvedInputPath, 'utf8'));
  const deck = resolveCanonicalDeck(input);
  const preflight = pdfExport.preflightStudioPdfExport(deck);
  if (preflight.warnings.length > 0) {
    console.error(`PDF export completed with ${preflight.warnings.length} warning(s):`);
    preflight.warnings.forEach((warning) => console.error(`- ${warning}`));
  }

  const exportServer = await startExportServer('', path.dirname(resolvedInputPath));
  try {
    const html = buildCanonicalPdfHtml(deck, exportServer.assetBaseUrl);
    await fs.writeFile(path.join(exportServer.temporaryDir, 'index.html'), html, 'utf8');
    await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await runChromePdfExport(exportServer.url, resolvedOutputPath, options);
  } finally {
    await closeExportServer(exportServer.server, exportServer.temporaryDir);
  }

  console.log(`Exported ${deck.slides.length} slide(s) to ${resolvedOutputPath}`);
  return 0;
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`PDF export failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_CHROME_TIMEOUT_MS,
  DEFAULT_VIRTUAL_TIME_BUDGET_MS,
  buildCanonicalPdfHtml,
  resolveCanonicalDeck,
  resolveChromeExecutable,
  runChromePdfExport,
  startExportServer,
  closeExportServer,
  main
};
