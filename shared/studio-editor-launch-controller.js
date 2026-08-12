(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLaunchController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLaunchController(options = {}) {
    const documentRef = options.documentRef || (root && root.document) || null;
    const localStorageRef = options.localStorageRef || (root && root.localStorage) || null;
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback, delayMs) => setTimeout(callback, delayMs);
    const createFrameLoadHandler = typeof options.createFrameLoadHandler === 'function'
      ? options.createFrameLoadHandler
      : () => () => false;
    const shouldHandleFrameLoad = typeof options.shouldHandleFrameLoad === 'function'
      ? options.shouldHandleFrameLoad
      : () => false;
    const initStudioFrame = typeof options.initStudioFrame === 'function'
      ? options.initStudioFrame
      : () => false;
    const applyZoom = typeof options.applyZoom === 'function'
      ? options.applyZoom
      : () => false;
    const loadVersions = typeof options.loadVersions === 'function'
      ? options.loadVersions
      : () => {};
    const loadPresentationMetadata = typeof options.loadPresentationMetadata === 'function'
      ? options.loadPresentationMetadata
      : null;
    const resolveLaunchSource = typeof options.resolveLaunchSource === 'function'
      ? options.resolveLaunchSource
      : (presentationUrl) => ({
          kind: 'url',
          url: presentationUrl,
          srcdoc: '',
          canonicalDeck: null
        });
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => '';
    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => 0;
    const shellController = options.shellController || null;
    const setFrameSource = typeof options.setFrameSource === 'function'
      ? options.setFrameSource
      : null;
    const consoleRef = options.consoleRef || (root && root.console) || null;

    function getSavedZoom() {
      const storedZoom = localStorageRef && typeof localStorageRef.getItem === 'function'
        ? localStorageRef.getItem('presentationZoom')
        : null;
      return storedZoom || 'fit';
    }

    async function launch(launchOptions = {}) {
      const presentationUrl = launchOptions.presentationUrl || '';
      const presentationTitle = launchOptions.presentationTitle || '';
      const editor = launchOptions.editor || null;
      const iframe = launchOptions.iframe || null;
      const sessionToken = launchOptions.sessionToken;
      const isEditorActive = typeof launchOptions.isEditorActive === 'function'
        ? launchOptions.isEditorActive
        : () => Boolean(editor && editor.classList && editor.classList.contains('active'));
      const frameLoadSessionStateReaders = launchOptions.frameLoadSessionStateReaders || {};

      if (!editor || !iframe) return false;

      iframe.onload = createFrameLoadHandler({
        presentationUrl,
        ...frameLoadSessionStateReaders,
        sessionToken,
        isEditorActive,
        handleLoad: () => {
          initStudioFrame();
        },
        afterLoad: () => {
          const savedZoom = getSavedZoom();
          schedule(() => {
            if (!shouldHandleFrameLoad(presentationUrl, {
              ...frameLoadSessionStateReaders,
              sessionToken,
              isEditorActive
            })) {
              return;
            }
            applyZoom(savedZoom);
          }, 150);
        }
      });

      loadVersions(presentationUrl, sessionToken);

      let loadedPresentationMetadata = null;
      try {
        loadedPresentationMetadata = loadPresentationMetadata
          ? await loadPresentationMetadata(presentationUrl, presentationTitle, sessionToken)
          : null;
      } catch (error) {
        if (consoleRef && typeof consoleRef.warn === 'function') {
          consoleRef.warn('Failed to load presentation metadata before editor render:', error);
        }
      }

      if (getCurrentPresentationUrl() !== presentationUrl
        || getCurrentSessionToken() !== sessionToken) {
        return false;
      }

      const launchSource = resolveLaunchSource(loadedPresentationMetadata, presentationUrl);
      const didOpenEditorShell = shellController
        && typeof shellController.open === 'function'
        ? shellController.open(editor, iframe, presentationUrl, launchSource)
        : false;
      if (!didOpenEditorShell) {
        editor.classList.remove('hidden');
        void editor.offsetWidth;
        if (setFrameSource) {
          setFrameSource(iframe, presentationUrl, launchSource);
        } else {
          iframe.src = presentationUrl;
        }
        editor.classList.add('active');
        editor.style.opacity = '1';
        editor.style.pointerEvents = 'auto';
        if (documentRef && documentRef.body && documentRef.body.style) {
          documentRef.body.style.overflow = 'hidden';
        }
      }
      return true;
    }

    return { launch };
  }

  return {
    createStudioEditorLaunchController
  };
});
