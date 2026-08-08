const test = require('node:test');
const assert = require('node:assert/strict');

const presentationLibrary = require('../shared/presentation-library.js');

const sampleLibrary = [
  {
    category: 'General',
    presentations: [
      { id: 'onboarding' },
      { id: 'ai-tools' }
    ]
  },
  {
    category: 'Research',
    presentations: [
      { id: 'pinns' }
    ]
  }
];

test('normalizePresentationLibraryData returns only valid groups', () => {
  assert.deepEqual(
    presentationLibrary.normalizePresentationLibraryData([sampleLibrary[0], null, 'bad', sampleLibrary[1]]),
    sampleLibrary
  );
  assert.deepEqual(presentationLibrary.normalizePresentationLibraryData(null), []);
});

test('listPresentationLibraryCategories preserves server ordering and prefixes all', () => {
  assert.deepEqual(
    presentationLibrary.listPresentationLibraryCategories(sampleLibrary),
    ['all', 'General', 'Research']
  );
});

test('resolvePresentationLibraryItems returns all or category-filtered presentations', () => {
  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'all'),
    [
      { id: 'onboarding' },
      { id: 'ai-tools' },
      { id: 'pinns' }
    ]
  );

  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'Research'),
    [
      { id: 'pinns' }
    ]
  );

  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'Missing'),
    []
  );
});

test('loadPresentationLibrary commits current normalized results', async () => {
  const fetchCalls = [];
  let committedData = null;
  let successData = null;

  const data = await presentationLibrary.loadPresentationLibrary({
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });
      return {
        ok: true,
        json: async () => [sampleLibrary[0], null, sampleLibrary[1]]
      };
    },
    commitPresentationLibraryData: (nextData) => {
      committedData = nextData;
    },
    onSuccess: (nextData) => {
      successData = nextData;
    }
  });

  assert.deepEqual(fetchCalls, [
    {
      url: '/api/presentations',
      init: {
        cache: 'no-store'
      }
    }
  ]);
  assert.deepEqual(data, sampleLibrary);
  assert.deepEqual(committedData, sampleLibrary);
  assert.deepEqual(successData, sampleLibrary);
});

test('loadPresentationLibrary skips stale success commits', async () => {
  let committedData = null;
  let successCalled = false;

  const data = await presentationLibrary.loadPresentationLibrary({
    fetchImpl: async () => ({
      ok: true,
      json: async () => sampleLibrary
    }),
    isCurrentLoad: () => false,
    commitPresentationLibraryData: (nextData) => {
      committedData = nextData;
    },
    onSuccess: () => {
      successCalled = true;
    }
  });

  assert.deepEqual(data, sampleLibrary);
  assert.equal(committedData, null);
  assert.equal(successCalled, false);
});

test('loadPresentationLibrary reports only current failures', async () => {
  const currentErrors = [];
  const staleErrors = [];

  await assert.rejects(() => presentationLibrary.loadPresentationLibrary({
    fetchImpl: async () => ({
      ok: false,
      status: 503
    }),
    onError: (error) => {
      currentErrors.push(error.message);
    }
  }), /503/);

  await assert.rejects(() => presentationLibrary.loadPresentationLibrary({
    fetchImpl: async () => ({
      ok: false,
      status: 504
    }),
    isCurrentLoad: () => false,
    onError: (error) => {
      staleErrors.push(error.message);
    }
  }), /504/);

  assert.deepEqual(currentErrors, ['Presentation library request failed with status 503']);
  assert.deepEqual(staleErrors, []);
});

test('createPresentation posts a trimmed title and returns the created entry', async () => {
  const fetchCalls = [];
  const createdPresentation = {
    id: 'team-kickoff',
    title: 'Team Kickoff',
    relativePath: 'presentations/team-kickoff/index.html'
  };

  const result = await presentationLibrary.createPresentation({
    title: '  Team Kickoff  ',
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });
      return {
        ok: true,
        status: 201,
        json: async () => ({ success: true, presentation: createdPresentation })
      };
    }
  });

  assert.deepEqual(result, createdPresentation);
  assert.deepEqual(fetchCalls, [{
    url: '/api/presentations/create',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Team Kickoff' })
    }
  }]);
});

test('createPresentation surfaces API errors and rejects blank titles', async () => {
  await assert.rejects(
    () => presentationLibrary.createPresentation({ title: '   ', fetchImpl: async () => ({}) }),
    /Presentation title is required/
  );

  await assert.rejects(
    () => presentationLibrary.createPresentation({
      title: 'Existing Deck',
      fetchImpl: async () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: 'A presentation with that name already exists' })
      })
    }),
    /A presentation with that name already exists/
  );
});
