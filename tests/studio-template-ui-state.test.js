const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('saveActiveSlideAsTemplate delegates the name and refreshes template state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function saveActiveSlideAsTemplate() {',
    '\n\n    function nudgeSelectedElements'
  );
  const input = { value: '  Quarterly Hero  ' };
  let delegatedName = '';
  let refreshCalls = 0;
  const context = {
    document: {
      getElementById(id) {
        return id === 'templateNameInput' ? input : null;
      }
    },
    studioEditorTemplateController: {
      saveActiveSlide(payload) {
        delegatedName = payload.name;
        return { templates: [{ id: 'quarterly' }] };
      }
    },
    updateTemplateActionState() {
      refreshCalls += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.saveActiveSlideAsTemplate(), true);
  assert.equal(delegatedName, 'Quarterly Hero');
  assert.equal(input.value, '');
  assert.equal(refreshCalls, 1);
});

test('renderSavedTemplates uses text content and shows the empty state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function renderSavedTemplates(templates = []) {',
    '\n\n    function updateTemplateActionState'
  );
  const list = {
    children: [],
    set textContent(value) {
      this.children = [];
      this.value = value;
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const context = {
    document: {
      getElementById() {
        return list;
      },
      createElement() {
        return {
          textContent: '',
          children: [],
          addEventListener() {},
          appendChild(child) {
            this.children.push(child);
          },
          setAttribute() {}
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.renderSavedTemplates([
    { name: '<Hero>', slide: { nodes: [{ id: 'title' }] } }
  ]), true);
  assert.equal(list.children[0].children[0].textContent, '<Hero> - 1 element');
  assert.equal(context.renderSavedTemplates([]), true);
  assert.equal(list.children[0].textContent, 'No slide templates saved');
});

test('insertSavedTemplate delegates to the template controller and refreshes editor state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function insertSavedTemplate(templateId) {',
    '\n\n    function nudgeSelectedElements'
  );
  let delegatedId = '';
  let templateRefreshes = 0;
  let blockRefreshes = 0;
  const context = {
    studioEditorTemplateController: {
      insertTemplate(templateId) {
        delegatedId = templateId;
        return true;
      }
    },
    updateTemplateActionState() {
      templateRefreshes += 1;
    },
    updateBlockActionState() {
      blockRefreshes += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.insertSavedTemplate('hero-template'), true);
  assert.equal(delegatedId, 'hero-template');
  assert.equal(templateRefreshes, 1);
  assert.equal(blockRefreshes, 1);
});

test('removeSavedTemplate delegates removal and refreshes template state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function removeSavedTemplate(templateId) {',
    '\n\n    function nudgeSelectedElements'
  );
  let delegatedId = '';
  let refreshCalls = 0;
  const context = {
    studioEditorTemplateController: {
      removeTemplate(templateId) {
        delegatedId = templateId;
        return { templates: [] };
      }
    },
    updateTemplateActionState() {
      refreshCalls += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.removeSavedTemplate('hero-template'), true);
  assert.equal(delegatedId, 'hero-template');
  assert.equal(refreshCalls, 1);
});
