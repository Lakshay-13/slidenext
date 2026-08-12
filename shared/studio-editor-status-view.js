(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStatusView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function setStudioAutoSaveStatus(options = {}) {
    const documentRef = options.documentRef;
    const statusEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('autoSaveStatus')
      : null;
    if (!statusEl) return false;

    const state = options.state;
    const progressPercent = Number.isFinite(options.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(options.progressPercent)))
      : null;
    const warningCount = Number.isInteger(options.warningCount) && options.warningCount > 0
      ? options.warningCount
      : 0;
    const warnings = Array.isArray(options.warnings)
      ? options.warnings.filter(warning => typeof warning === 'string' && warning.trim())
      : [];
    const errorMessage = typeof options.error === 'string' && options.error.trim()
      ? options.error.trim()
      : '';
    const isPptxWarningState = options.state === 'exported-with-warnings';
    const isPdfWarningState = options.state === 'pdf-exported-with-warnings';
    statusEl.title = (isPptxWarningState || isPdfWarningState) && warnings.length > 0
      ? `${isPdfWarningState ? 'PDF' : 'PPTX'} warnings:\n${warnings.map(warning => `- ${warning}`).join('\n')}${options.warningsTruncated === true ? '\n- Additional warnings not shown' : ''}`
      : errorMessage;
    if (state === 'loading') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Loading deck...</span>`;
    } else if (state === 'saving') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Saving...</span>`;
    } else if (state === 'autosave-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">AutoSave Failed</span>`;
    } else if (state === 'save-version-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">Save Version Failed</span>`;
    } else if (state === 'network-error') {
      statusEl.innerHTML = `<span class="text-rose-400">Network Error</span>`;
    } else if (state === 'history-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">Undo History Unavailable</span>`;
    } else if (state === 'exporting') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Exporting PPTX...</span>`;
    } else if (state === 'export-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">PPTX Export Failed</span>`;
    } else if (state === 'exported') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> PPTX Exported</span>`;
    } else if (state === 'exported-with-warnings') {
      const warningSuffix = warningCount > 0 ? ` (${warningCount})` : '';
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> PPTX Exported with warnings${warningSuffix}</span>`;
    } else if (state === 'exporting-pdf') {
      const progressSuffix = progressPercent === null ? '' : ` ${progressPercent}%`;
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Exporting PDF${progressSuffix}...</span>`;
    } else if (state === 'pdf-printing') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> PDF Print Dialog Open</span>`;
    } else if (state === 'pdf-export-failed') {
      statusEl.innerHTML = `<span class="text-rose-400">PDF Export Failed</span>`;
    } else if (state === 'pdf-exported') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> PDF Export Ready</span>`;
    } else if (state === 'pdf-exported-with-warnings') {
      const warningSuffix = warningCount > 0 ? ` (${warningCount})` : '';
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-400"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> PDF Export Ready with warnings${warningSuffix}</span>`;
    } else {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Saved to disk</span>`;
    }
    return true;
  }

  function setStudioAutoSaveStatusWithWarningCount(options = {}) {
    const progress = options.warningCount && typeof options.warningCount === 'object'
      ? options.warningCount
      : null;
    const error = typeof options.warningCount === 'string'
      ? options.warningCount
      : options.error;
    return setStudioAutoSaveStatus({
      ...options,
      warningCount: progress || typeof options.warningCount === 'string'
        ? 0
        : options.warningCount,
      warnings: progress ? [] : options.warnings,
      warningsTruncated: progress ? false : options.warningsTruncated,
      progressPercent: progress ? progress.percent : options.progressPercent,
      error
    });
  }

  function createStudioAutoSaveStatusSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => options.documentRef || null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : setStudioAutoSaveStatus;

    return function syncStudioAutoSaveStatus(state, progress = null) {
      try {
        return setStatus({
          documentRef: getDocument(),
          state,
          progressPercent: progress && typeof progress === 'object'
            ? progress.percent
            : null
        });
      } catch (error) {
        return false;
      }
    };
  }

  function createStudioAutoSaveStatusWithWarningCountSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => options.documentRef || null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : setStudioAutoSaveStatusWithWarningCount;

    return function syncStudioAutoSaveStatusWithWarningCount(
      state,
      warningCount = 0,
      warnings = [],
      warningsTruncated = false
    ) {
      try {
        const error = typeof warningCount === 'string' ? warningCount : '';
        return setStatus({
          documentRef: getDocument(),
          state,
          warningCount: error ? 0 : warningCount,
          warnings,
          warningsTruncated,
          error
        });
      } catch (error) {
        return false;
      }
    };
  }

  function createStudioSaveButtonStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => options.documentRef || null;
    const setState = typeof options.setState === 'function'
      ? options.setState
      : setStudioSaveButtonState;

    return function syncStudioSaveButtonState(state) {
      try {
        return setState({
          documentRef: getDocument(),
          state
        });
      } catch (error) {
        return false;
      }
    };
  }

  function setStudioSaveButtonState(options = {}) {
    const documentRef = options.documentRef;
    const saveBtn = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioSaveBtn')
      : null;
    if (!saveBtn) return false;

    if (options.state === 'saving-version') {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Creating version...</span>`;
      return true;
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] font-bold">bookmarks</span><span>Save Version</span>`;
    return true;
  }

  return {
    setStudioAutoSaveStatus,
    setStudioAutoSaveStatusWithWarningCount,
    createStudioAutoSaveStatusSync,
    createStudioAutoSaveStatusWithWarningCountSync,
    createStudioSaveButtonStateSync,
    setStudioSaveButtonState
  };
});
