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

    const canonicalDeck = resolveStudioPersistenceCanonicalDeck(options.canonicalDeck, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
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

  function isStudioPersistedState(cleanHtml = '', canonicalDeck = null, options = {}) {
    if (!isStudioPersistedHtml(cleanHtml, options.persistedHtml)) {
      return false;
    }

    return isStudioPersistedCanonicalDeck(canonicalDeck, options.persistedCanonicalDeck, options);
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

  function handleStudioPersistenceSuccess(context = {}, options = {}) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (context.shouldUpdatePersistedHtml !== false && typeof options.setPersistedHtml === 'function') {
      options.setPersistedHtml(context.cleanHtml);
    }
    if (context.canonicalDeck && typeof options.setPersistedCanonicalDeck === 'function') {
      options.setPersistedCanonicalDeck(context.canonicalDeck);
    }
    if (
      Object.prototype.hasOwnProperty.call(context, 'playbackState')
      && context.shouldUpdatePersistedPlaybackState !== false
      && typeof options.setPersistedPlaybackState === 'function'
    ) {
      options.setPersistedPlaybackState(context.playbackState);
    }
    if (typeof options.onSuccess === 'function') {
      options.onSuccess(context);
    }

    return true;
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
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (typeof options.onFailure === 'function') {
      options.onFailure(context);
    }

    return true;
  }

  return {
    resolveStudioPersistenceCanonicalDeck,
    createStudioPersistenceActionContext,
    createStudioVersionPersistenceActionContext,
    buildStudioSaveRequestBody,
    buildStudioPersistenceRequestPlan,
    buildStudioAutoSavePersistencePlan,
    buildStudioVersionCheckpointPersistencePlan,
    isStudioPersistedHtml,
    isStudioPersistedCanonicalDeck,
    isStudioPersistedState,
    isStudioPersistenceTaskStale,
    isStudioPersistenceActionCurrent,
    handleStudioPersistenceSuccess,
    handleStudioVersionPersistenceSuccess,
    handleStudioPersistenceFailure
  };
});
