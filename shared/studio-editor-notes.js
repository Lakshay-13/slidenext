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

  function getStudioSpeakerNotes(slide) {
    if (!slide) return '';
    if (typeof slide.getAttribute === 'function' || slide.dataset) {
      const speakerNotes = readAttribute(slide, SPEAKER_NOTES_ATTRIBUTE, 'speakerNotes');
      return speakerNotes || readAttribute(slide, LEGACY_NOTES_ATTRIBUTE, 'notes');
    }
    return normalizeSpeakerNotes(slide.notes);
  }

  function applyStudioSpeakerNotes(slide, notes, options = {}) {
    if (!slide) {
      return {
        didApply: false,
        notes: '',
        transaction: null
      };
    }

    const beforeSpeakerNotes = readAttribute(slide, SPEAKER_NOTES_ATTRIBUTE, 'speakerNotes');
    const beforeLegacyNotes = readAttribute(slide, LEGACY_NOTES_ATTRIBUTE, 'notes');
    const afterSpeakerNotes = normalizeSpeakerNotes(notes);
    if (beforeSpeakerNotes === afterSpeakerNotes && !beforeLegacyNotes) {
      return {
        didApply: false,
        notes: afterSpeakerNotes,
        transaction: null
      };
    }

    if (!writeAttribute(slide, SPEAKER_NOTES_ATTRIBUTE, 'speakerNotes', afterSpeakerNotes)) {
      return {
        didApply: false,
        notes: beforeSpeakerNotes || beforeLegacyNotes,
        transaction: null
      };
    }
    writeAttribute(slide, LEGACY_NOTES_ATTRIBUTE, 'notes', '');

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
            property: 'speakerNotes',
            before: beforeSpeakerNotes,
            after: afterSpeakerNotes
          },
          {
            element: slide,
            property: 'notes',
            before: beforeLegacyNotes,
            after: ''
          }
        ], {
          getElementId: options.getElementId
        })
      : null;

    return {
      didApply: true,
      notes: afterSpeakerNotes,
      transaction
    };
  }

  function syncStudioSpeakerNotesControl(options = {}) {
    const documentRef = options.documentRef;
    const controlId = typeof options.controlId === 'string' && options.controlId.trim()
      ? options.controlId
      : 'speakerNotesInput';
    const control = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById(controlId)
      : null;
    if (!control) return false;

    const activeSlide = options.activeSlide || null;
    control.value = getStudioSpeakerNotes(activeSlide);
    control.disabled = !activeSlide || options.canEdit !== true;
    return true;
  }

  return {
    SPEAKER_NOTES_ATTRIBUTE,
    LEGACY_NOTES_ATTRIBUTE,
    normalizeSpeakerNotes,
    getStudioSpeakerNotes,
    applyStudioSpeakerNotes,
    syncStudioSpeakerNotesControl
  };
});
