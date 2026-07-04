(function (root, factory) {
  const presentationMetadata = typeof module === 'object' && module.exports
    ? require('./presentation-metadata')
    : root && root.SlideNextPresentationMetadata;
  const api = factory(presentationMetadata);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistence = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (presentationMetadata) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function asPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function createStudioPersistableDeckState(doc = null, persistedDeckState = {}) {
    return {
      doc,
      ...asPlainObject(persistedDeckState)
    };
  }

  function resolveStudioPersistableDeckStateWithContent(persistedDeckState = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return normalizeString(nextPersistedDeckState.cleanHtml) ? nextPersistedDeckState : null;
  }

  function resolveStudioCapturedPersistableDeckState(cleanHtml = '', options = {}) {
    const nextCleanHtml = normalizeString(cleanHtml);
    const resolvedCanonicalDeck = options.canonicalDeck || null;
    const resolvedPlaybackState = options.playbackState;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : null;

    const canonicalDeck = nextCleanHtml && !resolvedCanonicalDeck && buildCanonicalDeck
      ? buildCanonicalDeck()
      : resolvedCanonicalDeck;
    const playbackState = typeof resolvedPlaybackState !== 'undefined'
      ? resolvedPlaybackState
      : (resolvePlaybackState ? resolvePlaybackState(canonicalDeck) : null);

    return {
      cleanHtml: nextCleanHtml,
      playbackState,
      canonicalDeck
    };
  }

  function areStudioPersistenceCanonicalDecksEqual(left, right, options = {}) {
    const areCanonicalDecksEqual = typeof options.areCanonicalDecksEqual === 'function'
      ? options.areCanonicalDecksEqual
      : (nextLeft, nextRight) => {
          if (nextLeft === nextRight) return true;
          if (!nextLeft || !nextRight) return !nextLeft && !nextRight;
          try {
            return JSON.stringify(nextLeft) === JSON.stringify(nextRight);
          } catch (err) {
            return false;
          }
        };

    return areCanonicalDecksEqual(left, right);
  }

  function resolveStudioPersistenceCanonicalDeck(deckLike = null, options = {}) {
    const resolvePresentationCanonicalDeck = typeof options.resolvePresentationCanonicalDeck === 'function'
      ? options.resolvePresentationCanonicalDeck
      : presentationMetadata && typeof presentationMetadata.resolvePresentationCanonicalDeck === 'function'
        ? presentationMetadata.resolvePresentationCanonicalDeck
        : null;
    if (resolvePresentationCanonicalDeck) {
      return resolvePresentationCanonicalDeck({ canonicalDeck: deckLike }, {
        createCanonicalDeck: options.createCanonicalDeck,
        isCanonicalDeck: options.isCanonicalDeck
      });
    }

    const canonicalDeck = asPlainObject(deckLike);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : () => true;
    return Array.isArray(canonicalDeck.slides) && isCanonicalDeck(canonicalDeck)
      ? canonicalDeck
      : null;
  }

  function resolveStudioSaveRequestCanonicalDeck(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const resolutionOptions = {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    };
    const canonicalDeck = resolveStudioPersistenceCanonicalDeck(options.canonicalDeck, resolutionOptions);
    if (canonicalDeck) {
      return isCanonicalDeck && isCanonicalDeck(options.canonicalDeck)
        ? options.canonicalDeck
        : canonicalDeck;
    }

    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!buildCanonicalDeck) {
      return null;
    }

    const fallbackCanonicalDeck = buildCanonicalDeck();
    const resolvedFallbackCanonicalDeck = resolveStudioPersistenceCanonicalDeck(
      fallbackCanonicalDeck,
      resolutionOptions
    );
    if (!resolvedFallbackCanonicalDeck) {
      return null;
    }

    return isCanonicalDeck && isCanonicalDeck(fallbackCanonicalDeck)
      ? fallbackCanonicalDeck
      : resolvedFallbackCanonicalDeck;
  }

  function resolveStudioCanonicalDeckOverride(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    if (!isCanonicalDeck) {
      return options.canonicalDeck || (buildCanonicalDeck ? buildCanonicalDeck() : null);
    }

    return resolveStudioSaveRequestCanonicalDeck({
      canonicalDeck: options.canonicalDeck,
      buildCanonicalDeck,
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
  }

  function createStudioPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    const context = {
      presentationUrl: normalizeString(presentationUrl),
      cleanHtml: normalizeString(cleanHtml),
      shouldUpdatePersistedHtml: options.shouldUpdatePersistedHtml !== false
    };
    const canonicalDeck = resolveStudioPersistenceCanonicalDeck(options.canonicalDeck, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
    if (canonicalDeck) {
      context.canonicalDeck = canonicalDeck;
    }
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      context.sessionToken = sessionToken;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'playbackState')) {
      context.playbackState = options.playbackState;
      context.shouldUpdatePersistedPlaybackState = options.shouldUpdatePersistedPlaybackState !== false;
    }
    return context;
  }

  function createStudioPersistedDeckStateActionContext(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const contextOptions = {
      ...options,
      canonicalDeck: nextPersistedDeckState.canonicalDeck
    };

    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      contextOptions.playbackState = nextPersistedDeckState.playbackState;
    }

    return createStudioPersistenceActionContext(
      presentationUrl,
      normalizeString(nextPersistedDeckState.cleanHtml),
      contextOptions
    );
  }

  function createStudioVersionPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    return createStudioPersistenceActionContext(presentationUrl, cleanHtml, {
      ...options,
      shouldUpdatePersistedHtml: false,
      shouldUpdatePersistedPlaybackState: false
    });
  }

  function buildStudioSaveRequestBody(presentationUrl = '', cleanHtml = '', options = {}) {
    const body = {
      htmlPath: normalizeString(presentationUrl),
      htmlContent: normalizeString(cleanHtml),
      isAutoSave: !!options.isAutoSave
    };
    const versionLabel = normalizeString(options.versionLabel);
    if (versionLabel) {
      body.versionLabel = versionLabel;
    }

    const canonicalDeck = resolveStudioSaveRequestCanonicalDeck(options);
    if (canonicalDeck) {
      body.canonicalDeck = canonicalDeck;
    }

    return body;
  }

  function buildStudioPersistenceRequestPlan(presentationUrl = '', cleanHtml = '', options = {}) {
    const isPersistedState = typeof options.isPersistedState === 'function'
      ? options.isPersistedState
      : null;
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const tentativeSaveRequestBody = isPersistedState && buildSaveRequestBody
      ? buildSaveRequestBody(cleanHtml)
      : null;
    const hasPersistedCurrentState = isPersistedState
      ? !!isPersistedState(tentativeSaveRequestBody, cleanHtml)
      : typeof options.isPersistedHtml === 'function'
        ? !!options.isPersistedHtml(cleanHtml)
        : false;
    const saveRequestBody = hasPersistedCurrentState
      ? null
      : tentativeSaveRequestBody || (buildSaveRequestBody ? buildSaveRequestBody(cleanHtml) : null);

    const persistenceContextOptions = {
      shouldUpdatePersistedHtml: !hasPersistedCurrentState,
      canonicalDeck: saveRequestBody && saveRequestBody.canonicalDeck,
      sessionToken: options.sessionToken,
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    };
    if (Object.prototype.hasOwnProperty.call(options, 'playbackState')) {
      persistenceContextOptions.playbackState = options.playbackState;
      persistenceContextOptions.shouldUpdatePersistedPlaybackState = options.shouldUpdatePersistedPlaybackState !== false;
    }

    return {
      hasPersistedCurrentHtml: hasPersistedCurrentState,
      hasPersistedCurrentState,
      saveRequestBody,
      persistenceContext: createStudioPersistenceActionContext(
        presentationUrl,
        cleanHtml,
        persistenceContextOptions
      )
    };
  }

  function buildStudioAutoSavePersistencePlan(persistedDeckState = {}, presentationUrl = '', options = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const cleanHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const requestPlanOptions = {
      isPersistedState: options.isPersistedState,
      buildSaveRequestBody: buildSaveRequestBody
        ? () => buildSaveRequestBody(nextPersistedDeckState.doc, cleanHtml, {
            presentationUrl,
            isAutoSave: true,
            canonicalDeck: nextPersistedDeckState.canonicalDeck
          })
        : null,
      sessionToken: options.sessionToken,
      shouldUpdatePersistedPlaybackState: !!nextPersistedDeckState.doc
    };

    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      requestPlanOptions.playbackState = nextPersistedDeckState.playbackState;
    }

    return buildStudioPersistenceRequestPlan(
      presentationUrl,
      cleanHtml,
      requestPlanOptions
    );
  }

  function createStudioAutoSavePersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return {
      persistedDeckState: nextPersistedDeckState,
      persistencePlan: buildStudioAutoSavePersistencePlan(
        nextPersistedDeckState,
        presentationUrl,
        options
      )
    };
  }

  function resolveStudioPersistenceStateWithContent(
    persistedDeckState = {},
    presentationUrl = '',
    options = {},
    createPersistenceState = null
  ) {
    const nextPersistedDeckState = resolveStudioPersistableDeckStateWithContent(persistedDeckState);
    if (!nextPersistedDeckState || typeof createPersistenceState !== 'function') {
      return null;
    }

    return createPersistenceState(
      nextPersistedDeckState,
      presentationUrl,
      options
    );
  }

  function resolveStudioPersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {},
    resolvePersistenceState = null
  ) {
    if (typeof resolvePersistenceState !== 'function') {
      return null;
    }

    return resolvePersistenceState(
      createStudioPersistableDeckState(doc, capturedDeckState),
      presentationUrl,
      options
    );
  }

  function resolveStudioPersistenceStateFromDocumentCapture(
    doc = null,
    presentationUrl = '',
    options = {},
    resolvePersistenceStateFromCapture = null
  ) {
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    if (!capturePersistableDeckState || typeof resolvePersistenceStateFromCapture !== 'function') {
      return null;
    }

    return resolvePersistenceStateFromCapture(
      doc,
      capturePersistableDeckState(doc),
      presentationUrl,
      asPlainObject(options.persistenceOptions)
    );
  }

  function resolveStudioAutoSavePersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateWithContent(
      persistedDeckState,
      presentationUrl,
      options,
      createStudioAutoSavePersistenceState
    );
  }

  function resolveStudioAutoSavePersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateFromCapture(
      doc,
      capturedDeckState,
      presentationUrl,
      options,
      resolveStudioAutoSavePersistenceState
    );
  }

  function createStudioAutoSaveRequest(persistencePlan = {}) {
    return {
      url: '/api/save',
      body: persistencePlan && persistencePlan.saveRequestBody
    };
  }

  async function executeStudioAutoSavePersistenceRequest(persistencePlan = {}, options = {}) {
    const autoSaveRequest = createStudioAutoSaveRequest(persistencePlan);
    return executeStudioPersistenceRequest(
      autoSaveRequest,
      {
        fetchImpl: options.fetchImpl
      }
    );
  }

  async function executeStudioAutoSavePersistenceRequestWithHandlers(
    autoSavePersistenceState = null,
    options = {}
  ) {
    if (!autoSavePersistenceState || !autoSavePersistenceState.persistencePlan) {
      return null;
    }

    const { persistencePlan } = autoSavePersistenceState;
    const data = await executeStudioAutoSavePersistenceRequest(
      persistencePlan,
      {
        fetchImpl: options.fetchImpl
      }
    );
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : null;
    const applyPersistenceFailure = typeof options.applyPersistenceFailure === 'function'
      ? options.applyPersistenceFailure
      : null;

    if (data && data.success) {
      if (applyPersistenceSuccess) {
        applyPersistenceSuccess(
          persistencePlan.persistenceContext,
          asPlainObject(options.successOptions)
        );
      }
    } else if (applyPersistenceFailure) {
      applyPersistenceFailure(
        persistencePlan.persistenceContext,
        asPlainObject(options.failureOptions)
      );
    }

    return {
      data,
      autoSavePersistenceState
    };
  }

  async function executeStudioPersistenceRequest(request = {}, options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : typeof fetch === 'function'
        ? fetch
        : null;
    if (!fetchImpl) {
      throw new TypeError('A fetch implementation is required to execute studio persistence requests.');
    }

    const response = await fetchImpl(normalizeString(request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request && request.body)
    });
    return response.json();
  }

  function buildStudioVersionCheckpointPersistencePlan(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : null;
    const requestPlanOptions = {
      isPersistedState: options.isPersistedState,
      buildSaveRequestBody: buildSaveRequestBody
        ? () => buildSaveRequestBody(options.doc, cleanHtml, {
            presentationUrl,
            versionLabel,
            canonicalDeck: options.canonicalDeck
          })
        : null,
      sessionToken: options.sessionToken,
      playbackState: Object.prototype.hasOwnProperty.call(options, 'playbackState')
        ? options.playbackState
        : resolvePlaybackState
          ? resolvePlaybackState(options.doc, options.canonicalDeck)
          : null,
      shouldUpdatePersistedPlaybackState: !!options.doc
    };

    return buildStudioPersistenceRequestPlan(
      presentationUrl,
      cleanHtml,
      requestPlanOptions
    );
  }

  function createStudioVersionCheckpointRequest(versionLabel = '', presentationUrl = '', persistencePlan = {}) {
    const hasPersistedCurrentState = !!(persistencePlan && persistencePlan.hasPersistedCurrentState);
    return {
      url: hasPersistedCurrentState ? '/api/versions/create' : '/api/save',
      body: hasPersistedCurrentState
        ? {
            htmlPath: normalizeString(presentationUrl),
            versionLabel: normalizeString(versionLabel)
          }
        : persistencePlan && persistencePlan.saveRequestBody
    };
  }

  async function executeStudioVersionCheckpointPersistenceRequest(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const persistencePlan = buildStudioVersionCheckpointPersistencePlan(
      versionLabel,
      cleanHtml,
      presentationUrl,
      options
    );
    const versionCheckpointRequest = createStudioVersionCheckpointRequest(
      versionLabel,
      presentationUrl,
      persistencePlan
    );
    const data = await executeStudioPersistenceRequest(
      versionCheckpointRequest,
      {
        fetchImpl: options.fetchImpl
      }
    );

    return {
      data,
      persistencePlan
    };
  }

  async function executeStudioVersionCheckpointPersistenceRequestWithSuccess(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointResult = await executeStudioVersionCheckpointPersistenceRequest(
      versionLabel,
      cleanHtml,
      presentationUrl,
      options
    );
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : null;

    if (
      applyPersistenceSuccess
      && versionCheckpointResult
      && versionCheckpointResult.data
      && versionCheckpointResult.data.success
      && versionCheckpointResult.persistencePlan
      && versionCheckpointResult.persistencePlan.persistenceContext
    ) {
      applyPersistenceSuccess(
        versionCheckpointResult.persistencePlan.persistenceContext,
        asPlainObject(options.successOptions)
      );
    }

    return versionCheckpointResult;
  }

  async function executeStudioVersionCheckpointSave(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const saveVersionCheckpoint = typeof options.saveVersionCheckpoint === 'function'
      ? options.saveVersionCheckpoint
      : null;
    if (!versionCheckpointPersistenceState || !saveVersionCheckpoint) {
      return null;
    }

    const data = await saveVersionCheckpoint(
      versionLabel,
      normalizeString(versionCheckpointPersistenceState.cleanHtml),
      presentationUrl,
      versionCheckpointPersistenceState.requestOptions
    );

    return {
      data,
      versionCheckpointPersistenceState
    };
  }

  async function executeStudioVersionCheckpointSaveWithSuccess(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointSaveResult = await executeStudioVersionCheckpointSave(
      versionLabel,
      versionCheckpointPersistenceState,
      presentationUrl,
      {
        saveVersionCheckpoint: options.saveVersionCheckpoint
      }
    );
    const applyVersionCheckpointSaveSuccess = typeof options.applyVersionCheckpointSaveSuccess === 'function'
      ? options.applyVersionCheckpointSaveSuccess
      : null;
    if (
      applyVersionCheckpointSaveSuccess
      && versionCheckpointSaveResult
      && versionCheckpointSaveResult.data
      && versionCheckpointSaveResult.data.success
    ) {
      applyVersionCheckpointSaveSuccess(
        versionCheckpointSaveResult.versionCheckpointPersistenceState || versionCheckpointPersistenceState,
        asPlainObject(options.successOptions)
      );
    }
    return versionCheckpointSaveResult;
  }

  async function executeStudioVersionCheckpointSaveWithFailure(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointSaveResult = await executeStudioVersionCheckpointSaveWithSuccess(
      versionLabel,
      versionCheckpointPersistenceState,
      presentationUrl,
      {
        saveVersionCheckpoint: options.saveVersionCheckpoint,
        applyVersionCheckpointSaveSuccess: options.applyVersionCheckpointSaveSuccess,
        successOptions: options.successOptions
      }
    );
    const applyPersistenceFailure = typeof options.applyPersistenceFailure === 'function'
      ? options.applyPersistenceFailure
      : null;
    const buildFailureOptions = typeof options.buildFailureOptions === 'function'
      ? options.buildFailureOptions
      : null;
    const failureContext = versionCheckpointSaveResult
      && versionCheckpointSaveResult.versionCheckpointPersistenceState
      && versionCheckpointSaveResult.versionCheckpointPersistenceState.persistenceContext
        ? versionCheckpointSaveResult.versionCheckpointPersistenceState.persistenceContext
        : versionCheckpointPersistenceState && versionCheckpointPersistenceState.persistenceContext;

    if (
      applyPersistenceFailure
      && versionCheckpointSaveResult
      && versionCheckpointSaveResult.data
      && !versionCheckpointSaveResult.data.success
      && failureContext
    ) {
      applyPersistenceFailure(
        failureContext,
        buildFailureOptions
          ? asPlainObject(buildFailureOptions(versionCheckpointSaveResult.data))
          : asPlainObject(options.failureOptions)
      );
    }

    return versionCheckpointSaveResult;
  }

  function isStudioVersionCheckpointSavePersisted(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    if (!versionCheckpointPersistenceState) {
      return false;
    }

    const persistencePlan = buildStudioVersionCheckpointPersistencePlan(
      versionLabel,
      normalizeString(versionCheckpointPersistenceState.cleanHtml),
      presentationUrl,
      {
        ...asPlainObject(versionCheckpointPersistenceState.requestOptions),
        isPersistedState: options.isPersistedState,
        buildSaveRequestBody: options.buildSaveRequestBody
      }
    );

    return !!(persistencePlan && persistencePlan.hasPersistedCurrentState);
  }

  function createStudioVersionCheckpointRequestOptions(persistedDeckState = {}, options = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const requestOptions = {
      doc: nextPersistedDeckState.doc,
      canonicalDeck: nextPersistedDeckState.canonicalDeck
    };
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      requestOptions.sessionToken = sessionToken;
    }
    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      requestOptions.playbackState = nextPersistedDeckState.playbackState;
    }
    return requestOptions;
  }

  function createStudioVersionCheckpointPersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const cleanHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    const sessionToken = normalizeSessionToken(options.sessionToken);
    return {
      cleanHtml,
      persistenceContext: createStudioVersionPersistenceActionContext(
        presentationUrl,
        cleanHtml,
        { sessionToken }
      ),
      requestOptions: createStudioVersionCheckpointRequestOptions(
        nextPersistedDeckState,
        { sessionToken }
      )
    };
  }

  function resolveStudioVersionCheckpointPersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateWithContent(
      persistedDeckState,
      presentationUrl,
      options,
      createStudioVersionCheckpointPersistenceState
    );
  }

  function resolveStudioVersionCheckpointPersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateFromCapture(
      doc,
      capturedDeckState,
      presentationUrl,
      options,
      resolveStudioVersionCheckpointPersistenceState
    );
  }

  function isStudioPersistedHtml(cleanHtml = '', persistedHtml = '') {
    return !!normalizeString(persistedHtml) && normalizeString(cleanHtml) === normalizeString(persistedHtml);
  }

  function isStudioPersistedCanonicalDeck(canonicalDeck, persistedCanonicalDeck, options = {}) {
    const nextCanonicalDeck = resolveStudioPersistenceCanonicalDeck(canonicalDeck, options);
    if (!nextCanonicalDeck) {
      return true;
    }

    const nextPersistedCanonicalDeck = resolveStudioPersistenceCanonicalDeck(persistedCanonicalDeck, options);
    if (!nextPersistedCanonicalDeck) {
      return false;
    }

    return areStudioPersistenceCanonicalDecksEqual(nextCanonicalDeck, nextPersistedCanonicalDeck, options);
  }

  function resolveStudioPersistedHtmlReuse(persistedDeckState = {}, options = {}) {
    const nextPersistedDeckState = resolveStudioPersistableDeckStateWithContent(persistedDeckState);
    if (!nextPersistedDeckState) {
      return '';
    }
    const persistedHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    if (!persistedHtml.trim()) {
      return '';
    }

    return isStudioPersistedCanonicalDeck(
      options.canonicalDeck,
      nextPersistedDeckState.canonicalDeck,
      options
    )
      ? persistedHtml
      : '';
  }

  function isStudioPersistedState(cleanHtml = '', canonicalDeck = null, options = {}) {
    if (!isStudioPersistedHtml(cleanHtml, options.persistedHtml)) {
      return false;
    }

    return isStudioPersistedCanonicalDeck(canonicalDeck, options.persistedCanonicalDeck, options);
  }

  function isStudioPersistedDeckHtml(cleanHtml = '', persistedDeckState = {}) {
    return isStudioPersistedHtml(
      cleanHtml,
      asPlainObject(persistedDeckState).cleanHtml
    );
  }

  function isStudioPersistedSaveRequest(
    saveRequestBody = null,
    persistedDeckState = {},
    cleanHtml = saveRequestBody && saveRequestBody.htmlContent,
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return isStudioPersistedState(
      cleanHtml,
      saveRequestBody && saveRequestBody.canonicalDeck,
      {
        ...options,
        persistedHtml: nextPersistedDeckState.cleanHtml,
        persistedCanonicalDeck: nextPersistedDeckState.canonicalDeck
      }
    );
  }

  function isStudioPersistenceTaskStale(presentationUrl = '', options = {}) {
    const requestedPresentationUrl = normalizeString(presentationUrl);
    const currentPresentationUrl = normalizeString(
      typeof options.getCurrentPresentationUrl === 'function'
        ? options.getCurrentPresentationUrl()
        : options.currentPresentationUrl
    );
    if (!requestedPresentationUrl || requestedPresentationUrl !== currentPresentationUrl) {
      return true;
    }

    const requestedSessionToken = normalizeSessionToken(options.sessionToken);
    if (requestedSessionToken === null) {
      return false;
    }

    const currentSessionToken = normalizeSessionToken(
      typeof options.getCurrentSessionToken === 'function'
        ? options.getCurrentSessionToken()
        : options.currentSessionToken
    );
    return currentSessionToken !== requestedSessionToken;
  }

  function clearStudioPersistenceTimers(options = {}) {
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (typeof clearTimeout === 'function' ? clearTimeout : () => {});
    const autoVersionTimers = options.autoVersionTimers && typeof options.autoVersionTimers === 'object'
      ? options.autoVersionTimers
      : {};

    if (typeof options.autoSaveDebounceTimer !== 'undefined' && options.autoSaveDebounceTimer !== null) {
      clearTimer(options.autoSaveDebounceTimer);
    }
    Object.values(autoVersionTimers).forEach((timerId) => {
      clearTimer(timerId);
    });

    return {
      autoSaveDebounceTimer: null,
      autoVersionTimers: {}
    };
  }

  function isStudioPersistenceActionCurrent(context = {}, options = {}) {
    const requestedPresentationUrl = normalizeString(context.presentationUrl);
    if (!requestedPresentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;

    if (normalizeString(getCurrentPresentationUrl()) !== requestedPresentationUrl) {
      return false;
    }

    const requestedSessionToken = normalizeSessionToken(context.sessionToken);
    if (requestedSessionToken === null) {
      return true;
    }

    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;

    return normalizeSessionToken(getCurrentSessionToken()) === requestedSessionToken;
  }

  function runStudioPersistenceActionIfCurrent(context = {}, options = {}, callback = null) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (typeof callback === 'function') {
      callback(context);
    }

    return true;
  }

  function handleStudioPersistenceSuccess(context = {}, options = {}) {
    return runStudioPersistenceActionIfCurrent(context, options, (nextContext) => {
      if (nextContext.shouldUpdatePersistedHtml !== false && typeof options.setPersistedHtml === 'function') {
        options.setPersistedHtml(nextContext.cleanHtml);
      }
      if (nextContext.canonicalDeck && typeof options.setPersistedCanonicalDeck === 'function') {
        options.setPersistedCanonicalDeck(nextContext.canonicalDeck);
      }
      if (
        Object.prototype.hasOwnProperty.call(nextContext, 'playbackState')
        && nextContext.shouldUpdatePersistedPlaybackState !== false
        && typeof options.setPersistedPlaybackState === 'function'
      ) {
        options.setPersistedPlaybackState(nextContext.playbackState);
      }
      if (typeof options.onSuccess === 'function') {
        options.onSuccess(nextContext);
      }
    });
  }

  function handleStudioVersionPersistenceSuccess(context = {}, options = {}) {
    return handleStudioPersistenceSuccess(context, {
      ...options,
      onSuccess(nextContext) {
        if (typeof options.onSuccess === 'function') {
          options.onSuccess(nextContext);
        }
        if (typeof options.refreshVersionEntries === 'function') {
          options.refreshVersionEntries(
            nextContext.presentationUrl,
            normalizeSessionToken(nextContext.sessionToken)
          );
        }
      }
    });
  }

  function handleStudioPersistenceFailure(context = {}, options = {}) {
    return runStudioPersistenceActionIfCurrent(context, options, (nextContext) => {
      if (typeof options.onFailure === 'function') {
        options.onFailure(nextContext);
      }
    });
  }

  return {
    createStudioPersistableDeckState,
    resolveStudioPersistableDeckStateWithContent,
    resolveStudioCapturedPersistableDeckState,
    resolveStudioPersistenceCanonicalDeck,
    resolveStudioSaveRequestCanonicalDeck,
    resolveStudioCanonicalDeckOverride,
    createStudioPersistenceActionContext,
    createStudioPersistedDeckStateActionContext,
    createStudioVersionPersistenceActionContext,
    buildStudioSaveRequestBody,
    buildStudioPersistenceRequestPlan,
    resolveStudioPersistenceStateFromDocumentCapture,
    buildStudioAutoSavePersistencePlan,
    createStudioAutoSavePersistenceState,
    resolveStudioAutoSavePersistenceState,
    resolveStudioAutoSavePersistenceStateFromCapture,
    createStudioAutoSaveRequest,
    executeStudioAutoSavePersistenceRequest,
    executeStudioAutoSavePersistenceRequestWithHandlers,
    executeStudioPersistenceRequest,
    buildStudioVersionCheckpointPersistencePlan,
    createStudioVersionCheckpointRequest,
    executeStudioVersionCheckpointPersistenceRequest,
    executeStudioVersionCheckpointPersistenceRequestWithSuccess,
    executeStudioVersionCheckpointSave,
    executeStudioVersionCheckpointSaveWithSuccess,
    executeStudioVersionCheckpointSaveWithFailure,
    isStudioVersionCheckpointSavePersisted,
    createStudioVersionCheckpointRequestOptions,
    createStudioVersionCheckpointPersistenceState,
    resolveStudioVersionCheckpointPersistenceState,
    resolveStudioVersionCheckpointPersistenceStateFromCapture,
    isStudioPersistedHtml,
    isStudioPersistedCanonicalDeck,
    resolveStudioPersistedHtmlReuse,
    isStudioPersistedState,
    isStudioPersistedDeckHtml,
    isStudioPersistedSaveRequest,
    isStudioPersistenceTaskStale,
    clearStudioPersistenceTimers,
    isStudioPersistenceActionCurrent,
    runStudioPersistenceActionIfCurrent,
    handleStudioPersistenceSuccess,
    handleStudioVersionPersistenceSuccess,
    handleStudioPersistenceFailure
  };
});
