const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const presentationCreationController = require('../shared/presentation-creation-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const SHELL_COMPOSITION_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'presentation-dashboard-shell-composition.js'
);

function createControllerContext(createPresentation) {
  const titleInput = {
    value: '  New Research Deck  '
  };
  const calls = [];
  const documentRef = {
    getElementById(id) {
      if (id === 'createPresentationTitle') return titleInput;
      return null;
    }
  };
  const view = {
    setPresentationCreationError(options) {
      calls.push(['error', options.message]);
    },
    setPresentationCreationBusyState(options) {
      calls.push(['busy', options.isBusy]);
    },
    closePresentationCreationModal() {
      calls.push(['close']);
      return true;
    }
  };
  const library = {
    createPresentation
  };
  const controller = presentationCreationController.createPresentationController({
    documentRef,
    presentationCreationView: view,
    presentationLibrary: library,
    async loadPresentations() {
      calls.push(['refresh']);
    },
    launchStudioEditor(...args) {
      calls.push(['launch', ...args]);
    }
  });
  return { controller, titleInput, calls };
}

test('submitCreatePresentation creates, refreshes, and opens the new deck', async () => {
  const { controller, titleInput, calls } = createControllerContext(async (options) => {
    assert.equal(options.title, '  New Research Deck  ');
    return {
      url: 'presentations/new-research-deck/index.html',
      title: 'New Research Deck',
      category: 'General'
    };
  });

  const result = await controller.submit({
    preventDefault() {
      calls.push(['preventDefault']);
    }
  });

  assert.equal(result.title, 'New Research Deck');
  assert.equal(titleInput.value, '');
  assert.deepEqual(calls, [
    ['preventDefault'],
    ['error', ''],
    ['busy', true],
    ['close'],
    ['refresh'],
    ['launch', 'presentations/new-research-deck/index.html', 'New Research Deck', 'General'],
    ['busy', false]
  ]);
});

test('submitCreatePresentation keeps the form open and reports creation errors', async () => {
  const { controller, calls } = createControllerContext(async () => {
    throw new Error('A presentation with that name already exists');
  });

  const result = await controller.submit({
    preventDefault() {}
  });

  assert.equal(result, null);
  assert.deepEqual(calls, [
    ['error', ''],
    ['busy', true],
    ['error', 'A presentation with that name already exists'],
    ['busy', false]
  ]);
});

test('creation controller binds the modal controls without inline handlers', () => {
  const calls = [];
  const elements = {};
  ['createPresentationBtn', 'cancelCreatePresentationBtn', 'createPresentationModal', 'createPresentationModalContent']
    .forEach((id) => {
      elements[id] = {
        listeners: {},
        addEventListener(type, handler) {
          this.listeners[type] = handler;
        }
      };
    });
  const controller = presentationCreationController.createPresentationController({
    documentRef: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    presentationCreationView: {
      openPresentationCreationModal() {
        calls.push('open');
        return true;
      },
      closePresentationCreationModal() {
        calls.push('close');
        return true;
      },
      setPresentationCreationError() {},
      setPresentationCreationBusyState() {}
    },
    presentationLibrary: {
      async createPresentation() {
        return { url: '/presentations/new/index.html', title: 'New', category: 'General' };
      }
    }
  });
  const documentRef = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  assert.deepEqual(
    controller.bindPresentationCreationButtons({ documentRef }),
    { open: true, close: true, submit: true, backdrop: true }
  );
  elements.createPresentationBtn.listeners.click();
  elements.cancelCreatePresentationBtn.listeners.click();
  elements.createPresentationModal.listeners.click({ target: elements.createPresentationModal });
  assert.deepEqual(calls, ['open', 'close', 'close']);
  assert.equal(typeof elements.createPresentationModalContent.listeners.submit, 'function');
});

test('dashboard markup exposes the new deck control and creation form', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const shellComposition = fs.readFileSync(SHELL_COMPOSITION_PATH, 'utf8');
  assert.match(source, /id="createPresentationBtn"/);
  assert.match(source, /id="createPresentationModal"/);
  assert.match(source, /id="createPresentationTitle"/);
  ['createPresentationBtn', 'cancelCreatePresentationBtn', 'createPresentationModalContent']
    .forEach((id) => {
      const line = source.split('\n').find((candidate) => candidate.includes(`id="${id}"`));
      assert.ok(line, `Missing creation control: ${id}`);
      assert.doesNotMatch(line, /onclick=|onsubmit=/);
    });
  assert.match(shellComposition, /bindPresentationCreationButtons\(\{\s*documentRef: options\.documentRef\s*\}\)/);
});
