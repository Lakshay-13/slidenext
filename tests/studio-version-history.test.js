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

test('createStudioVersionHistoryLoadOptionsBuilder reuses session-reader defaults and rendered version callbacks', () => {
  const calls = [];
  const createVersionHistoryLoadOptions = versionHistory.createStudioVersionHistoryLoadOptionsBuilder({
    createSessionReaderOptions(nextOptions = {}) {
      calls.push(['createSessionReaderOptions', {
        sessionToken: nextOptions.sessionToken,
        commitVersionEntries: typeof nextOptions.commitVersionEntries
      }]);
      return nextOptions;
    },
    renderVersionEntries(presentationUrl, versions) {
      calls.push(['renderVersionEntries', presentationUrl, versions]);
    }
  });

  const loadOptions = createVersionHistoryLoadOptions(
    '/presentations/onboarding-presentation/index.html',
    12
  );

  loadOptions.commitVersionEntries([
    { filename: 'index_20260101_120000_Auto.html' }
  ]);

  assert.equal(loadOptions.sessionToken, 12);
  assert.deepEqual(calls, [
    ['createSessionReaderOptions', {
      sessionToken: 12,
      commitVersionEntries: 'function'
    }],
    ['renderVersionEntries', '/presentations/onboarding-presentation/index.html', [
      { filename: 'index_20260101_120000_Auto.html' }
    ]]
  ]);
});

test('createStudioVersionHistoryLoader reuses load-option defaults and call-time overrides', async () => {
  const calls = [];
  const loadVersionHistory = versionHistory.createStudioVersionHistoryLoader({
    getPresentationUrl() {
      calls.push(['getPresentationUrl']);
      return '/presentations/default/index.html';
    },
    getSessionToken() {
      calls.push(['getSessionToken']);
      return 3;
    }
  });

  await loadVersionHistory(
    '/presentations/onboarding-presentation/index.html',
    12,
    {
      createLoadOptions(presentationUrl, sessionToken) {
        calls.push(['createLoadOptions', presentationUrl, sessionToken]);
        return { presentationUrl, sessionToken };
      },
      loadVersionHistory(presentationUrl, options = {}) {
        calls.push(['loadVersionHistory', presentationUrl, options]);
      }
    }
  );

  assert.deepEqual(calls, [
    ['createLoadOptions', '/presentations/onboarding-presentation/index.html', 12],
    ['loadVersionHistory', '/presentations/onboarding-presentation/index.html', {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 12
    }]
  ]);
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
