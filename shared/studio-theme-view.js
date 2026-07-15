(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioThemeView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LIGHT_THEME_OVERRIDE = `
          :root, html {
            --color-bg-base: #fafafa !important;
            --color-bg-surface: #ffffff !important;
            --color-bg-surface-glass: rgba(255, 255, 255, 0.75) !important;
            --color-primary: #7028d0 !important;
            --color-primary-rgb: 112, 40, 208 !important;
            --color-secondary: #5050e8 !important;
            --color-tertiary: #6030d8 !important;
            --color-text-primary: #1f2937 !important;
            --color-text-muted: #4b5563 !important;
          }
          body {
            background-color: #fafafa !important;
            color: #1f2937 !important;
          }
          .glass-panel, .glass-card, .code-block, .git-graph {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.08) !important;
            color: #1f2937 !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04) !important;
          }
          .glass-panel::before {
            background: linear-gradient(135deg, rgba(112, 40, 208, 0.2), rgba(112, 40, 208, 0.02)) !important;
          }
          h1, h2, h3, h4, h5, h6, .text-white, .text-2xl, .text-3xl, .text-4xl, .text-5xl, .text-6xl, .text-7xl {
            color: #1f2937 !important;
          }
          p, span, li, .text-\[\#bcc9c6\], .text-\[\#bcc9c6\]\/80 {
            color: #4b5563 !important;
          }
          #particlesCanvas, .canvas-particles {
            opacity: 0.25 !important;
          }
          .bg-animated-glow, .bg-animated-glow-ambient, .bg-animated-glow-ambient-layer {
            opacity: 0.15 !important;
          }
          .bg-grid-overlay {
            background-image:
              linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px) !important;
          }
          .code-keyword { color: #d73a49 !important; }
          .code-command { color: #0550ae !important; }
          .code-arg { color: #0550ae !important; }
          .code-comment { color: #6a737d !important; }
        `;

  function syncStudioIframeTheme(options = {}) {
    const iframeDoc = options.iframeDoc;
    if (!iframeDoc || !iframeDoc.documentElement) return false;

    const isDark = !!options.isDark;
    if (isDark) {
      iframeDoc.documentElement.classList.add('dark');
    } else {
      iframeDoc.documentElement.classList.remove('dark');
    }

    const styleId = 'editor-theme-override-tag';
    let styleEl = iframeDoc.getElementById(styleId);
    if (!styleEl) {
      styleEl = iframeDoc.createElement('style');
      styleEl.id = styleId;
      iframeDoc.head.appendChild(styleEl);
    }
    styleEl.textContent = isDark ? '' : LIGHT_THEME_OVERRIDE;
    return true;
  }

  return { syncStudioIframeTheme };
});
