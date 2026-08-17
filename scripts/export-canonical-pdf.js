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
  console.error('Usage: node scripts/export-canonical-pdf.js <canonical-deck.json|deck.html> <output.pdf>');
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

function countPdfPages(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer) && !(pdfBuffer instanceof Uint8Array)) {
    return 0;
  }
  const source = Buffer.from(pdfBuffer).toString('latin1');
  return (source.match(/\/Type\s*\/Page\b/g) || []).length;
}

function validatePdfArtifact(pdfBuffer, expectedSlideCount = null) {
  if (!Buffer.isBuffer(pdfBuffer) && !(pdfBuffer instanceof Uint8Array)) {
    throw new Error('PDF export did not produce a binary artifact');
  }
  const normalizedBuffer = Buffer.from(pdfBuffer);
  if (normalizedBuffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('PDF export did not produce a valid PDF artifact');
  }
  const pageCount = countPdfPages(normalizedBuffer);
  if (Number.isInteger(expectedSlideCount) && pageCount !== expectedSlideCount) {
    throw new Error(`PDF slide count mismatch: expected ${expectedSlideCount}, found ${pageCount}`);
  }
  return { buffer: normalizedBuffer, pageCount };
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

function createPdfAssetExists(assetBaseDir = WORKSPACE_ROOT, assetRootDir = WORKSPACE_ROOT) {
  const resolvedAssetRootDir = path.resolve(assetRootDir || WORKSPACE_ROOT);
  const resolvedAssetBaseDir = path.resolve(assetBaseDir || resolvedAssetRootDir);
  const normalizeLocalAssetSource = (assetSource) => {
    const withoutUrlDecorators = assetSource.split(/[?#]/, 1)[0];
    try {
      return decodeURIComponent(withoutUrlDecorators);
    } catch (error) {
      return withoutUrlDecorators;
    }
  };
  return (assetSource) => {
    if (typeof assetSource !== 'string' || !assetSource.trim()) return false;
    const source = assetSource.trim();
    if (/^(?:data:|https?:\/\/)/i.test(source)) return true;
    const localSource = normalizeLocalAssetSource(source);
    const sourcePath = localSource.startsWith('/')
      ? resolveContainedPath(resolvedAssetRootDir, localSource.replace(/^[/\\]+/, ''))
      : resolveContainedPath(resolvedAssetBaseDir, localSource);
    if (!sourcePath) return false;
    try {
      return fsSync.statSync(sourcePath).isFile();
    } catch (error) {
      return false;
    }
  };
}

function countLegacyHtmlSlides(html, slideSelector = '.slide') {
  if (typeof html !== 'string' || !html.trim()) return 0;
  const selectorMatch = `${slideSelector}`.trim().match(/^\.([A-Za-z_][\w-]*)$/);
  if (!selectorMatch) return 0;
  const className = selectorMatch[1];
  const classAttributePattern = /\bclass\s*=\s*(['"])(.*?)\1/gi;
  let count = 0;
  let match = classAttributePattern.exec(html);
  while (match) {
    if (match[2].split(/\s+/).includes(className)) count += 1;
    match = classAttributePattern.exec(html);
  }
  return count;
}

function extractLegacyPdfAssetReferences(html) {
  if (typeof html !== 'string' || !html.trim()) return [];

  const references = new Set();
  const addReference = (value) => {
    const source = typeof value === 'string' ? value.trim() : '';
    if (!source
      || /^(?:data:|https?:\/\/|\/\/|#|blob:|mailto:|javascript:)/i.test(source)) {
      return;
    }
    references.add(source);
  };
  const assetAttributePattern = /<(?:img|video|audio|source|iframe|script)\b[^>]*?\b(?:src|poster)\s*=\s*(['"])(.*?)\1/gi;
  const linkAttributePattern = /<link\b[^>]*?\bhref\s*=\s*(['"])(.*?)\1/gi;
  const cssUrlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

  let match = assetAttributePattern.exec(html);
  while (match) {
    addReference(match[2]);
    match = assetAttributePattern.exec(html);
  }
  match = linkAttributePattern.exec(html);
  while (match) {
    addReference(match[2]);
    match = linkAttributePattern.exec(html);
  }
  match = cssUrlPattern.exec(html);
  while (match) {
    addReference(match[2]);
    match = cssUrlPattern.exec(html);
  }

  return Array.from(references);
}

function preflightLegacyPdfExport(html, options = {}) {
  const slideSelector = typeof options.slideSelector === 'string' && options.slideSelector.trim()
    ? options.slideSelector
    : '.slide';
  const assetExists = typeof options.assetExists === 'function'
    ? options.assetExists
    : createPdfAssetExists(options.assetBaseDir, options.assetRootDir);
  const missingAssets = extractLegacyPdfAssetReferences(html)
    .filter((source) => {
      try {
        return !assetExists(source);
      } catch (error) {
        return true;
      }
    })
    .map((source) => ({ source }));

  return {
    canExport: countLegacyHtmlSlides(html, slideSelector) > 0,
    slideCount: countLegacyHtmlSlides(html, slideSelector),
    warnings: missingAssets.map((asset) => (
      `PDF legacy HTML references unavailable asset "${asset.source}"`
    )),
    missingAssets
  };
}

function resolveLegacyHtmlSourcePath(sourcePath, workspaceRoot = WORKSPACE_ROOT) {
  if (typeof sourcePath !== 'string' || !sourcePath.trim()) return '';
  const normalizedSourcePath = sourcePath.trim().replace(/^[/\\]+/, '');
  const resolvedPath = resolveContainedPath(workspaceRoot, normalizedSourcePath);
  if (!resolvedPath) return '';
  try {
    return fsSync.statSync(resolvedPath).isFile() ? resolvedPath : '';
  } catch (error) {
    return '';
  }
}

function resolveLegacyHtmlSiblingPath(inputPath) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) return '';
  const siblingPath = path.join(path.dirname(path.resolve(inputPath)), 'index.html');
  try {
    return fsSync.statSync(siblingPath).isFile() ? siblingPath : '';
  } catch (error) {
    return '';
  }
}

function resolveLegacyHtmlInputPath(inputPath) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) return '';
  const resolvedPath = path.resolve(inputPath);
  if (path.extname(resolvedPath).toLowerCase() !== '.html') return '';
  try {
    return fsSync.statSync(resolvedPath).isFile() ? resolvedPath : '';
  } catch (error) {
    return '';
  }
}

function buildLegacyPdfHtml(html, options = {}) {
  const slideSelector = typeof options.slideSelector === 'string' && options.slideSelector.trim()
    ? options.slideSelector
    : '.slide';
  return pdfExport.buildStudioPdfPrintHtml(html, {
    pageWidth: options.pageWidth,
    pageHeight: options.pageHeight,
    slideSelector,
    baseHref: options.baseHref,
    slideCount: options.slideCount
  });
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

async function exportCanonicalPdfBuffer(deck, options = {}) {
  const assetBaseDir = path.resolve(options.assetBaseDir || WORKSPACE_ROOT);
  const exportServer = await startExportServer('', assetBaseDir);
  try {
    const html = buildCanonicalPdfHtml(deck, exportServer.assetBaseUrl);
    await fs.writeFile(path.join(exportServer.temporaryDir, 'index.html'), html, 'utf8');
    const pdfBuffer = await runChromePdfExport(
      exportServer.url,
      path.join(exportServer.temporaryDir, 'deck.pdf'),
      options
    );
    return validatePdfArtifact(pdfBuffer, deck.slides.length).buffer;
  } finally {
    await closeExportServer(exportServer.server, exportServer.temporaryDir);
  }
}

async function exportLegacyPdfBuffer(html, options = {}) {
  const slideSelector = typeof options.slideSelector === 'string' && options.slideSelector.trim()
    ? options.slideSelector
    : '.slide';
  const slideCount = Number.isInteger(options.slideCount)
    ? options.slideCount
    : countLegacyHtmlSlides(html, slideSelector);
  if (slideCount <= 0) {
    throw new Error(`Legacy PDF source has no slides matching ${slideSelector}`);
  }

  const assetBaseDir = path.resolve(options.assetBaseDir || WORKSPACE_ROOT);
  const exportServer = await startExportServer('', assetBaseDir);
  try {
    const printHtml = buildLegacyPdfHtml(html, {
      ...options,
      baseHref: exportServer.assetBaseUrl,
      slideSelector,
      slideCount
    });
    await fs.writeFile(path.join(exportServer.temporaryDir, 'index.html'), printHtml, 'utf8');
    const pdfBuffer = await runChromePdfExport(
      exportServer.url,
      path.join(exportServer.temporaryDir, 'deck.pdf'),
      options
    );
    return validatePdfArtifact(pdfBuffer, slideCount).buffer;
  } finally {
    await closeExportServer(exportServer.server, exportServer.temporaryDir);
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
  const directLegacyHtmlPath = resolveLegacyHtmlInputPath(resolvedInputPath);
  if (directLegacyHtmlPath) {
    const legacyHtml = await fs.readFile(directLegacyHtmlPath, 'utf8');
    const preflight = preflightLegacyPdfExport(legacyHtml, {
      assetBaseDir: path.dirname(directLegacyHtmlPath)
    });
    if (preflight.warnings.length > 0) {
      console.error(`PDF export completed with ${preflight.warnings.length} warning(s):`);
      preflight.warnings.forEach((warning) => console.error(`- ${warning}`));
    }
    const pdfBuffer = await exportLegacyPdfBuffer(legacyHtml, {
      ...options,
      assetBaseDir: path.dirname(directLegacyHtmlPath)
    });
    await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await fs.writeFile(resolvedOutputPath, pdfBuffer);
    console.log(`Exported ${countPdfPages(pdfBuffer)} legacy slide(s) to ${resolvedOutputPath}`);
    return 0;
  }
  const input = JSON.parse(await fs.readFile(resolvedInputPath, 'utf8'));
  const hasCanonicalDeckPayload = Boolean(
    presentationMetadata.resolvePresentationCanonicalDeck(input)
    || (input && typeof input === 'object' && (
      Array.isArray(input.slides)
      || (input.canonicalDeck && typeof input.canonicalDeck === 'object')
    ))
  );
  if (!hasCanonicalDeckPayload) {
    const legacySourcePath = resolveLegacyHtmlSiblingPath(resolvedInputPath);
    if (legacySourcePath) {
      const legacyHtml = await fs.readFile(legacySourcePath, 'utf8');
      const preflight = preflightLegacyPdfExport(legacyHtml, {
        assetBaseDir: path.dirname(legacySourcePath)
      });
      if (preflight.warnings.length > 0) {
        console.error(`PDF export completed with ${preflight.warnings.length} warning(s):`);
        preflight.warnings.forEach((warning) => console.error(`- ${warning}`));
      }
      const pdfBuffer = await exportLegacyPdfBuffer(legacyHtml, {
        ...options,
        assetBaseDir: path.dirname(legacySourcePath)
      });
      await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
      await fs.writeFile(resolvedOutputPath, pdfBuffer);
      console.log(`Exported ${countPdfPages(pdfBuffer)} legacy slide(s) to ${resolvedOutputPath}`);
      return 0;
    }
  }

  const deck = resolveCanonicalDeck(input);
  const assetBaseDir = path.dirname(resolvedInputPath);
  const preflight = pdfExport.preflightStudioPdfExport(deck, {
    assetExists: createPdfAssetExists(assetBaseDir)
  });
  if (preflight.warnings.length > 0) {
    console.error(`PDF export completed with ${preflight.warnings.length} warning(s):`);
    preflight.warnings.forEach((warning) => console.error(`- ${warning}`));
  }

  const pdfBuffer = await exportCanonicalPdfBuffer(deck, {
    ...options,
    assetBaseDir
  });
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, pdfBuffer);

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
  countPdfPages,
  validatePdfArtifact,
  countLegacyHtmlSlides,
  extractLegacyPdfAssetReferences,
  preflightLegacyPdfExport,
  resolveLegacyHtmlSourcePath,
  resolveLegacyHtmlSiblingPath,
  resolveLegacyHtmlInputPath,
  buildLegacyPdfHtml,
  createStudioPdfWarningDetailsHeader: pdfExport.createStudioPdfWarningDetailsHeader,
  preflightStudioPdfExport: pdfExport.preflightStudioPdfExport,
  createPdfAssetExists,
  resolveCanonicalDeck,
  resolveChromeExecutable,
  runChromePdfExport,
  exportCanonicalPdfBuffer,
  exportLegacyPdfBuffer,
  startExportServer,
  closeExportServer,
  main
};
