(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInsertion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const IMAGE_SOURCE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800';

  function resolveOffset(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function centeredPosition(percent, offset) {
    return `calc(${percent}% + ${offset}px)`;
  }

  function clearInlineStyleProperty(style, propertyName) {
    if (!style) return;
    if (typeof style.removeProperty === 'function') {
      style.removeProperty(propertyName);
      return;
    }
    delete style[propertyName];
  }

  function applyStudioInsertedLayoutMode(element, layoutMode) {
    if (!element || layoutMode !== 'flow') return;
    ['position', 'left', 'top'].forEach((propertyName) => {
      clearInlineStyleProperty(element.style, propertyName);
    });
  }

  function createStudioInsertedElement(type, options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.createElement !== 'function') return null;

    const offset = resolveOffset(options.offset);
    let element = null;
    if (type === 'h2') {
      element = documentRef.createElement('h2');
      element.textContent = 'New Heading';
      element.style.fontSize = '48px';
      element.style.fontWeight = '700';
      element.style.color = '#ffffff';
      element.style.fontFamily = "'Geist', sans-serif";
      element.style.position = 'absolute';
      element.style.left = centeredPosition(30, offset);
      element.style.top = centeredPosition(40, offset);
    } else if (type === 'p') {
      element = documentRef.createElement('p');
      element.textContent = 'Enter text descriptions here.';
      element.style.fontSize = '20px';
      element.style.fontWeight = '400';
      element.style.color = '#bcc9c6';
      element.style.fontFamily = "'Geist', sans-serif";
      element.style.position = 'absolute';
      element.style.left = centeredPosition(30, offset);
      element.style.top = centeredPosition(50, offset);
    } else if (type === 'img') {
      element = documentRef.createElement('img');
      element.src = IMAGE_SOURCE;
      element.style.width = '450px';
      element.style.borderRadius = '12px';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(40, offset);
      element.style.top = centeredPosition(30, offset);
    } else if (type === 'icon') {
      element = documentRef.createElement('span');
      element.className = 'material-symbols-outlined';
      element.textContent = 'auto_awesome';
      element.style.fontSize = '72px';
      element.style.color = '#c4a1ff';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(48, offset);
      element.style.top = centeredPosition(42, offset);
    } else if (type === 'shape') {
      element = documentRef.createElement('div');
      element.className = 'editor-shape';
      element.style.width = '200px';
      element.style.height = '200px';
      element.style.backgroundColor = '#7028d0';
      element.style.borderRadius = '16px';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(45, offset);
      element.style.top = centeredPosition(40, offset);
    } else if (type === 'table') {
      element = documentRef.createElement('table');
      element.className = 'editor-table border-collapse border border-white/10 rounded-lg text-left text-sm';
      element.style.width = '600px';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(30, offset);
      element.style.top = centeredPosition(35, offset);
      element.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      element.style.backgroundColor = 'rgba(10, 10, 10, 0.6)';
      element.style.color = '#ffffff';
      element.style.borderRadius = '8px';
      element.style.fontFamily = "'Geist', sans-serif";
      element.innerHTML = `
          <thead>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.15)">
              <th style="padding: 10px; font-weight: 600; color: #7028d0">Metric</th>
              <th style="padding: 10px; font-weight: 600; color: #7028d0">Value</th>
              <th style="padding: 10px; font-weight: 600; color: #7028d0">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08)">
              <td style="padding: 10px;">Accuracy</td>
              <td style="padding: 10px;">94.2%</td>
              <td style="padding: 10px; color: #10b981">+2.4%</td>
            </tr>
            <tr>
              <td style="padding: 10px;">Latency</td>
              <td style="padding: 10px;">12ms</td>
              <td style="padding: 10px; color: #10b981">-4ms</td>
            </tr>
          </tbody>
        `;
    } else if (type === 'code') {
      element = documentRef.createElement('pre');
      element.className = 'editor-code border border-white/10 rounded-lg p-4 font-mono text-xs overflow-x-auto';
      element.style.width = '550px';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(35, offset);
      element.style.top = centeredPosition(40, offset);
      element.style.backgroundColor = '#0c0c0e';
      element.style.color = '#a9b1d6';
      element.style.borderRadius = '10px';
      element.style.border = '1px solid rgba(255, 255, 255, 0.1)';

      const codeNode = documentRef.createElement('code');
      codeNode.textContent = `// Sample algorithm block
function trainEpoch(model, data) {
  const loss = model.computeLoss(data);
  loss.backward();
  model.step();
  return loss.val;
}`;
      element.appendChild(codeNode);
    } else if (type === 'embed') {
      element = documentRef.createElement('div');
      element.className = 'editor-embed-placeholder';
      element.textContent = 'Media / Embed Placeholder';
      if (typeof element.setAttribute === 'function') {
        element.setAttribute('data-embed-placeholder', 'true');
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', 'Media or embed placeholder');
      }
      element.style.width = '560px';
      element.style.height = '315px';
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(30, offset);
      element.style.top = centeredPosition(35, offset);
      element.style.border = '1px dashed rgba(196, 161, 255, 0.65)';
      element.style.borderRadius = '12px';
      element.style.backgroundColor = 'rgba(112, 40, 208, 0.14)';
      element.style.color = '#c4a1ff';
      element.style.fontFamily = "'Geist', sans-serif";
      element.style.fontSize = '18px';
      element.style.fontWeight = '600';
    } else if (type === 'chart') {
      element = documentRef.createElement('div');
      element.className = 'editor-chart';
      if (typeof element.setAttribute === 'function') {
        element.setAttribute('data-chart-type', 'bar');
        element.setAttribute('data-chart-labels', 'Q1,Q2,Q3,Q4');
        element.setAttribute('data-chart-values', '42,68,55,86');
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', 'Bar chart placeholder');
      }
      element.style.width = '600px';
      element.style.height = '360px';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.gap = '18px';
      element.style.padding = '24px';
      element.style.position = 'absolute';
      element.style.left = centeredPosition(28, offset);
      element.style.top = centeredPosition(32, offset);
      element.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      element.style.borderRadius = '14px';
      element.style.backgroundColor = 'rgba(10, 10, 10, 0.72)';
      element.style.color = '#f4f4f5';
      element.style.fontFamily = "'Geist', sans-serif";

      const title = documentRef.createElement('span');
      title.className = 'editor-chart-title';
      title.textContent = 'Quarterly trend';
      title.style.fontSize = '18px';
      title.style.fontWeight = '600';
      element.appendChild(title);

      const chartBody = documentRef.createElement('div');
      chartBody.className = 'editor-chart-bars';
      chartBody.style.flex = '1';
      chartBody.style.display = 'flex';
      chartBody.style.alignItems = 'flex-end';
      chartBody.style.gap = '18px';
      chartBody.style.borderBottom = '1px solid rgba(255, 255, 255, 0.16)';
      [42, 68, 55, 86].forEach((height, index) => {
        const bar = documentRef.createElement('div');
        bar.className = 'editor-chart-bar';
        if (typeof bar.setAttribute === 'function') {
          bar.setAttribute('data-chart-value', height);
        }
        bar.style.height = `${height}%`;
        bar.style.flex = '1';
        bar.style.borderRadius = '6px 6px 0 0';
        bar.style.backgroundColor = index % 2 === 0 ? '#7028d0' : '#c4a1ff';
        chartBody.appendChild(bar);
      });
      element.appendChild(chartBody);
    }

    applyStudioInsertedLayoutMode(element, options.layoutMode === 'flow' ? 'flow' : 'absolute');
    return element;
  }

  function applyStudioElementInsertion(type, options = {}) {
    const slide = options.slide || null;
    const documentRef = options.documentRef;
    if (!slide || typeof slide.appendChild !== 'function') {
      return {
        element: null,
        transaction: null
      };
    }

    const element = createStudioInsertedElement(type, {
      documentRef,
      offset: options.offset,
      layoutMode: options.layoutMode
    });
    if (!element) {
      return {
        element: null,
        transaction: null
      };
    }

    const prepareElement = typeof options.prepareElement === 'function'
      ? options.prepareElement
      : null;
    if (prepareElement) {
      prepareElement(element);
    }

    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const transactionElementId = typeof options.transactionElementId === 'string'
      ? options.transactionElementId.trim()
      : '';
    const markupCapture = createMarkupTransactionCapture && transactionElementId
      ? createMarkupTransactionCapture([{
          element: slide,
          elementId: transactionElementId
        }], {
          getElementId: options.getElementId
        })
      : null;

    slide.appendChild(element);

    return {
      element,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    createStudioInsertedElement,
    applyStudioElementInsertion
  };
});
