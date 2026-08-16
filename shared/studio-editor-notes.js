(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNotes = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SPEAKER_NOTES_ATTRIBUTE = 'data-speaker-notes';
  const LEGACY_NOTES_ATTRIBUTE = 'data-notes';

  function normalizeSpeakerNotes(value) {
    return value === null || value === undefined ? '' : `${value}`;
  }

  function readAttribute(element, attributeName, datasetKey) {
    if (!element) return '';
    if (typeof element.getAttribute === 'function') {
      return normalizeSpeakerNotes(element.getAttribute(attributeName));
    }
    if (element.dataset && Object.prototype.hasOwnProperty.call(element.dataset, datasetKey)) {
      return normalizeSpeakerNotes(element.dataset[datasetKey]);
    }
    return '';
  }

  function writeAttribute(element, attributeName, datasetKey, value) {
    if (!element) return false;
    const nextValue = normalizeSpeakerNotes(value);
    if (typeof element.setAttribute === 'function' && typeof element.removeAttribute === 'function') {
      if (nextValue) {
        element.setAttribute(attributeName, nextValue);
      } else {
        element.removeAttribute(attributeName);
      }
      return true;
    }
    if (!element.dataset) return false;
    if (nextValue) {
      element.dataset[datasetKey] = nextValue;
    } else {
      delete element.dataset[datasetKey];
    }
    return true;
  }

  function getStudioSlideAttribute(slide, attributeName, datasetKey, canonicalKey) {
    if (!slide) return '';
    if (typeof slide.getAttribute === 'function' || slide.dataset) {
      return readAttribute(slide, attributeName, datasetKey);
    }
    return normalizeSpeakerNotes(slide[canonicalKey]);
  }

  function applyStudioSlideAttribute(slide, value, options = {}) {
    if (!slide) {
      return {
        didApply: false,
        notes: '',
        transaction: null
      };
    }

    const attributeName = normalizeSpeakerNotes(options.attributeName);
    const datasetKey = normalizeSpeakerNotes(options.datasetKey);
    const legacyAttributeName = normalizeSpeakerNotes(options.legacyAttributeName);
    const legacyDatasetKey = normalizeSpeakerNotes(options.legacyDatasetKey);
    const beforeValue = readAttribute(slide, attributeName, datasetKey);
    const beforeLegacyValue = legacyAttributeName && legacyDatasetKey
      ? readAttribute(slide, legacyAttributeName, legacyDatasetKey)
      : '';
    const afterValue = normalizeSpeakerNotes(value);
    if (beforeValue === afterValue && !beforeLegacyValue) {
      return {
        didApply: false,
        notes: afterValue,
        transaction: null
      };
    }

    if (!writeAttribute(slide, attributeName, datasetKey, afterValue)) {
      return {
        didApply: false,
        notes: beforeValue || beforeLegacyValue,
        transaction: null
      };
    }
    if (legacyAttributeName && legacyDatasetKey) {
      writeAttribute(slide, legacyAttributeName, legacyDatasetKey, '');
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStudioDatasetTransaction = transactionApi
      && typeof transactionApi.createStudioDatasetTransaction === 'function'
      ? transactionApi.createStudioDatasetTransaction
      : null;
    const transaction = createStudioDatasetTransaction
      ? createStudioDatasetTransaction([
          {
            element: slide,
            property: datasetKey,
            before: beforeValue,
            after: afterValue
          },
          ...(legacyAttributeName && legacyDatasetKey
            ? [{
                element: slide,
                property: legacyDatasetKey,
                before: beforeLegacyValue,
                after: ''
              }]
            : [])
        ], {
          getElementId: options.getElementId
        })
      : null;

    return {
      didApply: true,
      notes: afterValue,
      transaction
    };
  }

  function applyStudioSpeakerNotes(slide, notes, options = {}) {
    return applyStudioSlideAttribute(slide, notes, {
      ...options,
      attributeName: SPEAKER_NOTES_ATTRIBUTE,
      datasetKey: 'speakerNotes',
      legacyAttributeName: LEGACY_NOTES_ATTRIBUTE,
      legacyDatasetKey: 'notes'
    });
  }

  function getStudioSpeakerNotes(slide) {
    const speakerNotes = getStudioSlideAttribute(
      slide,
      SPEAKER_NOTES_ATTRIBUTE,
      'speakerNotes',
      'notes'
    );
    return speakerNotes || readAttribute(slide, LEGACY_NOTES_ATTRIBUTE, 'notes') || normalizeSpeakerNotes(slide && slide.notes);
  }

  function getStudioSlideSection(slide) {
    return getStudioSlideAttribute(slide, 'data-slide-section', 'slideSection', 'section');
  }

  function applyStudioSlideSection(slide, section, options = {}) {
    return applyStudioSlideAttribute(slide, section, {
      ...options,
      attributeName: 'data-slide-section',
      datasetKey: 'slideSection'
    });
  }

  function syncStudioSlideMetadataControl(options = {}) {
    const documentRef = options.documentRef;
    const controlId = typeof options.controlId === 'string' && options.controlId.trim()
      ? options.controlId
      : 'speakerNotesInput';
    const control = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById(controlId)
      : null;
    if (!control) return false;

    const activeSlide = options.activeSlide || null;
    const getValue = typeof options.getValue === 'function'
      ? options.getValue
      : getStudioSpeakerNotes;
    control.value = getValue(activeSlide);
    control.disabled = !activeSlide || options.canEdit !== true;
    return true;
  }

  function syncStudioSpeakerNotesControl(options = {}) {
    return syncStudioSlideMetadataControl({
      ...options,
      getValue: getStudioSpeakerNotes
    });
  }

  function syncStudioSlideSectionControl(options = {}) {
    return syncStudioSlideMetadataControl({
      ...options,
      controlId: options.controlId || 'slideSectionInput',
      getValue: getStudioSlideSection
    });
  }

  function bindStudioEditorNotesControls(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const updateActiveSlideNotes = typeof options.updateActiveSlideNotes === 'function'
      ? options.updateActiveSlideNotes
      : null;
    const updateActiveSlideSection = typeof options.updateActiveSlideSection === 'function'
      ? options.updateActiveSlideSection
      : null;
    const bindings = {};
    const controls = [
      ['speakerNotesInput', updateActiveSlideNotes],
      ['slideSectionInput', updateActiveSlideSection]
    ];
    controls.forEach(([id, handler]) => {
      const control = documentRef.getElementById(id);
      if (!control || typeof control.addEventListener !== 'function') {
        bindings[id] = false;
        return;
      }
      control.addEventListener('change', (event) => {
        if (!handler) return;
        const target = event && event.currentTarget ? event.currentTarget : control;
        handler(target && typeof target.value !== 'undefined' ? target.value : '');
      });
      bindings[id] = true;
    });
    return bindings;
  }

  return {
    SPEAKER_NOTES_ATTRIBUTE,
    LEGACY_NOTES_ATTRIBUTE,
    normalizeSpeakerNotes,
    getStudioSlideAttribute,
    applyStudioSlideAttribute,
    getStudioSpeakerNotes,
    applyStudioSpeakerNotes,
    getStudioSlideSection,
    applyStudioSlideSection,
    syncStudioSlideMetadataControl,
    syncStudioSpeakerNotesControl,
    syncStudioSlideSectionControl,
    bindStudioEditorNotesControls
  };
});
