const test = require('node:test');
const assert = require('node:assert/strict');

const versionHistory = require('../shared/studio-version-history.js');

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('deriveStudioVersionDeckBaseName removes the presentation extension', () => {
  assert.equal(
    versionHistory.deriveStudioVersionDeckBaseName('/presentations/onboarding-presentation/index.html'),
    'index'
  );
  assert.equal(versionHistory.deriveStudioVersionDeckBaseName(''), '');
});

test('loadStudioVersionHistory commits fetched versions when the requested deck is still current', async () => {
  const fetchDeferred = createDeferred();
  const committedVersions = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';

  const versionsPromise = versionHistory.loadStudioVersionHistory(currentPresentationUrl, {
    fetchImpl: async () => fetchDeferred.promise,
    getCurrentPresentationUrl: () => currentPresentationUrl,
    commitVersionEntries: (versions) => {
      committedVersions.push(versions);
    }
  });

  fetchDeferred.resolve({
    ok: true,
    async json() {
      return [
        { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
      ];
    }
  });

  const versions = await versionsPromise;
  assert.deepEqual(versions, [
    { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
  ]);
  assert.deepEqual(committedVersions, [versions]);
});

test('loadStudioVersionHistory skips committing stale versions after the current deck changes', async () => {
  const fetchDeferred = createDeferred();
  const committedVersions = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';

  const versionsPromise = versionHistory.loadStudioVersionHistory(currentPresentationUrl, {
    fetchImpl: async () => fetchDeferred.promise,
    getCurrentPresentationUrl: () => currentPresentationUrl,
    commitVersionEntries: (versions) => {
      committedVersions.push(versions);
    }
  });

  currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  fetchDeferred.resolve({
    ok: true,
    async json() {
      return [
        { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
      ];
    }
  });

  const versions = await versionsPromise;
  assert.deepEqual(versions, [
    { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
  ]);
  assert.deepEqual(committedVersions, []);
});

test('loadStudioVersionHistory skips committing stale same-url editor sessions', async () => {
  const fetchDeferred = createDeferred();
  const committedVersions = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  let currentSessionToken = 2;

  const versionsPromise = versionHistory.loadStudioVersionHistory(currentPresentationUrl, {
    fetchImpl: async () => fetchDeferred.promise,
    sessionToken: 2,
    getCurrentPresentationUrl: () => currentPresentationUrl,
    getCurrentSessionToken: () => currentSessionToken,
    commitVersionEntries: (versions) => {
      committedVersions.push(versions);
    }
  });

  currentSessionToken = 3;
  fetchDeferred.resolve({
    ok: true,
    async json() {
      return [
        { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
      ];
    }
  });

  const versions = await versionsPromise;
  assert.deepEqual(versions, [
    { filename: 'index_20260101_120000_Auto.html', createdAt: '2026-01-01T12:00:00.000Z' }
  ]);
  assert.deepEqual(committedVersions, []);
});
