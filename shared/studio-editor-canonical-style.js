(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalStyle = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const CANONICAL_STYLE_PROPERTIES = {
    size: { property: 'font-size', domProperty: 'fontSize' },
    family: { property: 'font-family', domProperty: 'fontFamily' },
    weight: { property: 'font-weight', domProperty: 'fontWeight' },
    italic: { property: 'font-style', domProperty: 'fontStyle' },
    underline: { property: 'text-decoration', domProperty: 'textDecoration' },
    lineHeight: { property: 'line-height', domProperty: 'lineHeight' },
    color: { property: 'color', domProperty: 'color' },
    align: { property: 'text-align', domProperty: 'textAlign' },
    opacity: { property: 'opacity', domProperty: 'opacity' },
    borderStyle: { property: 'border-style', domProperty: 'borderStyle' },
    borderWidth: { property: 'border-width', domProperty: 'borderWidth' },
    borderRadius: { property: 'border-radius', domProperty: 'borderRadius' },
    borderColor: { property: 'border-color', domProperty: 'borderColor' },
    objectFit: { property: 'object-fit', domProperty: 'objectFit' },
    objectPosition: { property: 'object-position', domProperty: 'objectPosition' }
  };

  function resolveElementId(element, getElementId) {
    if (typeof getElementId === 'function') {
      return getElementId(element);
    }
    return element && element.dataset && element.dataset.editorId;
  }

  function runCanonicalStyleMutation(callback) {
    try {
      return callback();
    } catch (err) {
      return null;
    }
  }

  function buildStudioCanonicalStyleBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!canonicalDeckApi) return null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    if (createCanonicalDeckBaselineReader) {
      const readCanonicalDeckBaseline = createCanonicalDeckBaselineReader({
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof readCanonicalDeckBaseline === 'function'
        ? readCanonicalDeckBaseline(options.sourceDocument)
        : null;
    }

    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      const validate = typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    };
    const readCanonicalDeckBaseline = (sourceDocument) => {
      if (getPendingCanonicalDeck) {
        try {
          const pendingCanonicalDeck = getPendingCanonicalDeck(sourceDocument);
          if (isValidCanonicalDeck(pendingCanonicalDeck)) return pendingCanonicalDeck;
        } catch (err) {
          // Fall through to the live baseline and document rebuild paths.
        }
      }
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (err) {
          // Fall through to the document rebuild path.
        }
      }
      if (!buildCanonicalDeck) return null;
      try {
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument, {
          preferLiveCanonicalDeck: false
        });
        return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
      } catch (err) {
        return null;
      }
    };

    return readCanonicalDeckBaseline(options.sourceDocument);
  }

  function buildStudioCanonicalStyleMutation(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalDeckBeforeMutation = options.canonicalDeckBeforeMutation || null;
    const selection = Array.isArray(options.selection) ? options.selection : [];
    const prop = typeof options.prop === 'string' ? options.prop : '';
    const value = options.value;
    const hasRequestedStyleValue = options.styleValue !== undefined
      && options.styleValue !== null;
    const getElementId = options.getElementId;

    if (!canonicalDeckApi || !canonicalDeckBeforeMutation || selection.length === 0) {
      return null;
    }

    if (prop === 'zIndex' && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function') {
      const canonicalNodeLayouts = selection.map((element) => {
        const elementId = resolveElementId(element, getElementId);
        const zIndex = hasRequestedStyleValue
          ? Number(options.styleValue)
          : element && element.style
            ? Number(element.style.zIndex)
            : NaN;
        return elementId && Number.isFinite(zIndex)
          ? { id: elementId, layout: { zIndex } }
          : null;
      }).filter(Boolean);
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeLayout(
        canonicalDeckBeforeMutation,
        canonicalNodeLayouts
      ));
    }

    if (prop === 'text' && typeof canonicalDeckApi.updateCanonicalNodeText === 'function') {
      const element = selection[0];
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeText(canonicalDeckBeforeMutation, [{
        id: resolveElementId(element, getElementId),
        text: `${value}`
      }]));
    }

    if (prop === 'chartValues' && typeof canonicalDeckApi.updateCanonicalNodeAttributes === 'function') {
      const element = selection[0];
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeAttributes(
        canonicalDeckBeforeMutation,
        [{
          id: resolveElementId(element, getElementId),
          attributes: { 'data-chart-values': `${value}` }
        }]
      ));
    }

    if (prop === 'chartTitle' && typeof canonicalDeckApi.updateCanonicalNodeAttributes === 'function') {
      const element = selection[0];
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeAttributes(
        canonicalDeckBeforeMutation,
        [{
          id: resolveElementId(element, getElementId),
          attributes: { 'data-chart-title': `${value}` }
        }]
      ));
    }

    if (prop === 'src' && typeof canonicalDeckApi.updateCanonicalNodeAttributes === 'function') {
      const element = selection[0];
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeAttributes(canonicalDeckBeforeMutation, [{
        id: resolveElementId(element, getElementId),
        attributes: { src: `${value}` }
      }]));
    }

    const styleProperty = CANONICAL_STYLE_PROPERTIES[prop];
    if (styleProperty && typeof canonicalDeckApi.updateCanonicalNodeStyle === 'function') {
      return runCanonicalStyleMutation(() => canonicalDeckApi.updateCanonicalNodeStyle(
        canonicalDeckBeforeMutation,
        selection.map((element) => ({
          id: resolveElementId(element, getElementId),
          property: styleProperty.property,
          value: hasRequestedStyleValue
            ? `${options.styleValue}`
            : element
              && element.style
              && typeof element.style[styleProperty.domProperty] === 'string'
              ? element.style[styleProperty.domProperty]
              : `${value}`
        }))
      ));
    }

    return null;
  }

  function buildStudioCanonicalStyleMutationWithBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    if (!canonicalDeckApi
      || (!buildCanonicalDeck && !buildCanonicalDeckBaseline && !getCanonicalDeckBaseline)) return null;

    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalStyleBaseline({
          canonicalDeckApi,
          canonicalStateApi,
          buildCanonicalDeck,
          buildCanonicalDeckBaseline,
          getPendingCanonicalDeck,
          getCanonicalDeckBaseline,
          sourceDocument: options.sourceDocument
        });
    return buildStudioCanonicalStyleMutation({
      ...options,
      canonicalDeckBeforeMutation
    });
  }

  function createStudioCanonicalStyleMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalStyleBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalStyleBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        canonicalStateApi,
        getPendingCanonicalDeck,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalStyleMutation = (mutationOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        mutationOptions,
        'canonicalDeckBeforeMutation'
      )
        ? mutationOptions.canonicalDeckBeforeMutation
        : buildCanonicalStyleBaseline(mutationOptions);
      return buildStudioCanonicalStyleMutation({
        ...mutationOptions,
        buildCanonicalDeck,
        canonicalDeckApi,
        canonicalStateApi,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalStyleBaseline,
      buildCanonicalStyleMutation
    };
  }

  return {
    buildStudioCanonicalStyleBaseline,
    buildStudioCanonicalStyleMutation,
    buildStudioCanonicalStyleMutationWithBaseline,
    createStudioCanonicalStyleMutationBuilders
  };
});
