(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalGroup = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalGroupBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const groupCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.groupCanonicalNodes === 'function'
      ? canonicalDeckApi.groupCanonicalNodes
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    if (!groupCanonicalNodes) return null;
    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }
    if (!buildCanonicalDeck) return null;
    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalUngroupBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const ungroupCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.ungroupCanonicalNodes === 'function'
      ? canonicalDeckApi.ungroupCanonicalNodes
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    if (!ungroupCanonicalNodes) return null;
    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }
    if (!buildCanonicalDeck) return null;
    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalGroupDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const groupCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.groupCanonicalNodes === 'function'
      ? canonicalDeckApi.groupCanonicalNodes
      : null;
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalGroupBaseline(options);
    const groupElement = options.groupElement;
    const slideId = typeof options.slideId === 'string' ? options.slideId : '';
    const parentNodeId = typeof options.parentNodeId === 'string' ? options.parentNodeId : '';
    const nodeIds = Array.isArray(options.nodeIds) ? options.nodeIds.filter(Boolean) : [];
    const getNodeId = typeof options.getNodeId === 'function'
      ? options.getNodeId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!groupCanonicalNodes
      || !importElementToCanonicalNode
      || !canonicalDeckBeforeMutation
      || !groupElement
      || !slideId
      || nodeIds.length < 2) {
      return null;
    }

    const groupNode = importElementToCanonicalNode(groupElement, { getNodeId });
    if (!groupNode) return null;
    return groupCanonicalNodes(
      canonicalDeckBeforeMutation,
      slideId,
      parentNodeId,
      nodeIds,
      groupNode
    );
  }

  function createStudioCanonicalGroupMutationBuilders(options = {}) {
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
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const buildCanonicalGroupBaseline = (groupOptions = {}) => (
      buildStudioCanonicalGroupBaseline({
        ...groupOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalGroupDeck = (groupOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        groupOptions,
        'canonicalDeckBeforeMutation'
      )
        ? groupOptions.canonicalDeckBeforeMutation
        : buildCanonicalGroupBaseline(groupOptions);
      return buildStudioCanonicalGroupDeck({
        ...groupOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline,
        importElementToCanonicalNode,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalGroupBaseline,
      buildCanonicalGroupDeck
    };
  }

  function buildStudioCanonicalUngroupDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const ungroupCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.ungroupCanonicalNodes === 'function'
      ? canonicalDeckApi.ungroupCanonicalNodes
      : null;
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalUngroupBaseline(options);
    const groupTargets = Array.isArray(options.groupTargets) ? options.groupTargets : [];
    const restoredGroups = Array.isArray(options.restoredGroups) ? options.restoredGroups : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!ungroupCanonicalNodes
      || !importElementToCanonicalNode
      || !canonicalDeckBeforeMutation
      || groupTargets.length === 0
      || restoredGroups.length !== groupTargets.length) {
      return null;
    }

    const canonicalGroupChanges = groupTargets.map((target) => {
      const restoredGroup = restoredGroups.find((entry) => entry && entry.group === target.group);
      if (!restoredGroup || !Array.isArray(restoredGroup.restoredElements)) return null;
      const children = restoredGroup.restoredElements.map((element) => importElementToCanonicalNode(element, {
        getNodeId: getElementId
      }));
      if (children.some((child) => !child)) return null;
      return {
        groupId: target.groupId,
        parentNodeId: target.parentNodeId,
        children
      };
    });
    if (canonicalGroupChanges.some((change) => !change)) return null;

    const slideId = groupTargets[0] && groupTargets[0].slideId;
    return ungroupCanonicalNodes(canonicalDeckBeforeMutation, slideId, canonicalGroupChanges);
  }

  function createStudioCanonicalUngroupMutationBuilders(options = {}) {
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
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const buildCanonicalUngroupBaseline = (ungroupOptions = {}) => (
      buildStudioCanonicalUngroupBaseline({
        ...ungroupOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalUngroupDeck = (ungroupOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        ungroupOptions,
        'canonicalDeckBeforeMutation'
      )
        ? ungroupOptions.canonicalDeckBeforeMutation
        : buildCanonicalUngroupBaseline(ungroupOptions);
      return buildStudioCanonicalUngroupDeck({
        ...ungroupOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline,
        importElementToCanonicalNode,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalUngroupBaseline,
      buildCanonicalUngroupDeck
    };
  }

  return {
    buildStudioCanonicalGroupBaseline,
    buildStudioCanonicalGroupDeck,
    createStudioCanonicalGroupMutationBuilders,
    buildStudioCanonicalUngroupBaseline,
    buildStudioCanonicalUngroupDeck,
    createStudioCanonicalUngroupMutationBuilders
  };
});
