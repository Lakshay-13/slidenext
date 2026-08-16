const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INDEX_HTML_PATH = path.join(ROOT, 'index.html');

function readSharedScripts() {
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  return [...indexHtml.matchAll(/<script\s+src="(\/shared\/[^"?]+\.js)"\s*>\s*<\/script>/g)]
    .map((match) => match[1].replace(/^\/shared\//, 'shared/'));
}

function findGlobalProviders(scripts) {
  const providers = new Map();
  scripts.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    for (const match of source.matchAll(/root\.(SlideNext[A-Za-z0-9_]+)\s*=\s*api/g)) {
      if (!providers.has(match[1])) providers.set(match[1], relativePath);
    }
  });
  return providers;
}

function findEagerWrapperDependencies(source) {
  const wrapper = source.split('})(typeof globalThis')[0];
  return [...wrapper.split('\n')]
    .filter((line) => !line.includes('=>'))
    .flatMap((line) => [...line.matchAll(/root(?:\s*&&\s*root)?\.?(SlideNext[A-Za-z0-9_]+)/g)])
    .map((match) => match[1]);
}

test('shared browser scripts load eager global dependencies before consumers', () => {
  const scripts = readSharedScripts();
  const providers = findGlobalProviders(scripts);
  const violations = [];

  scripts.forEach((relativePath, consumerIndex) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    for (const dependency of new Set(findEagerWrapperDependencies(source))) {
      const provider = providers.get(dependency);
      if (!provider) continue;
      const providerIndex = scripts.indexOf(provider);
      if (providerIndex > consumerIndex) {
        violations.push(`${relativePath} captures ${dependency} before ${provider}`);
      }
    }
  });

  assert.deepEqual(violations, []);
});
