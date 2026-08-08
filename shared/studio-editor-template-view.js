(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioTemplateLibrary(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') {
      return false;
    }
    const list = documentRef.getElementById('savedTemplatesList');
    if (!list || typeof documentRef.createElement !== 'function') return false;

    const normalizedTemplates = Array.isArray(options.templates) ? options.templates : [];
    const canInsert = !!options.canInsert;
    const insertTemplate = typeof options.insertTemplate === 'function' ? options.insertTemplate : () => {};
    const removeTemplate = typeof options.removeTemplate === 'function' ? options.removeTemplate : () => {};
    list.textContent = '';
    if (normalizedTemplates.length === 0) {
      const emptyState = documentRef.createElement('span');
      emptyState.textContent = 'No slide templates saved';
      list.appendChild(emptyState);
      return true;
    }

    normalizedTemplates.forEach((template) => {
      const row = documentRef.createElement('div');
      row.className = 'flex items-center gap-1';
      const item = documentRef.createElement('button');
      item.type = 'button';
      item.className = 'min-w-0 flex-1 text-left rounded px-2 py-1 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      const nodeCount = template
        && template.slide
        && Array.isArray(template.slide.nodes)
        ? template.slide.nodes.length
        : 0;
      const templateName = template && template.name ? template.name : 'Unnamed Template';
      item.textContent = `${templateName} - ${nodeCount} element${nodeCount === 1 ? '' : 's'}`;
      item.disabled = !canInsert;
      item.addEventListener('click', () => insertTemplate(template.id));

      const removeButton = documentRef.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'shrink-0 rounded px-1.5 py-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 transition-colors';
      removeButton.textContent = 'Remove';
      removeButton.title = `Remove ${templateName}`;
      removeButton.setAttribute('aria-label', `Remove ${templateName}`);
      removeButton.addEventListener('click', () => removeTemplate(template.id));

      row.appendChild(item);
      row.appendChild(removeButton);
      list.appendChild(row);
    });
    return true;
  }

  function syncStudioTemplateState(options = {}) {
    const documentRef = options.documentRef;
    const canUseTemplateActions = !!options.canUseTemplateActions;
    if (documentRef && typeof documentRef.getElementById === 'function') {
      ['saveActiveSlideTemplateBtn', 'templateNameInput'].forEach((id) => {
        const control = documentRef.getElementById(id);
        if (control) control.disabled = !canUseTemplateActions;
      });
    }
    return renderStudioTemplateLibrary({
      ...options,
      canInsert: canUseTemplateActions
    });
  }

  return {
    renderStudioTemplateLibrary,
    syncStudioTemplateState
  };
});
