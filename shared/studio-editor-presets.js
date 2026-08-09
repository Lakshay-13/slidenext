(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresets = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const wallpaperPresetsData = {
    solid: [
      { name: 'Obsidian Black', value: '#050505' },
      { name: 'Slate Grey', value: '#121212' },
      { name: 'Deep Carbon', value: '#1e1e1e' },
      { name: 'Dark Teal', value: '#0d2b28' },
      { name: 'Navy Blue', value: '#0a1128' },
      { name: 'Plum Purple', value: '#1b0a21' },
      { name: 'Steel Blue', value: '#1e293b' },
      { name: 'Crimson Red', value: '#270c10' },
      { name: 'Pure White', value: '#ffffff' },
      { name: 'Light Alabaster', value: '#fafafa' },
      { name: 'Light Sand', value: '#f4f4f5' },
      { name: 'Soft Mint', value: '#f0fdf4' }
    ],
    gradient: [
      { name: 'Neon Teal', value: 'radial-gradient(circle, rgba(112,40,208,0.25) 0%, #050505 85%)' },
      { name: 'Cyber Violet', value: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, #050505 85%)' },
      { name: 'Sunset Aura', value: 'radial-gradient(circle, rgba(225,29,72,0.2) 0%, #050505 85%)' },
      { name: 'Deep Sea', value: 'linear-gradient(135deg, #0a1128 0%, #000000 100%)' },
      { name: 'Electric Indigo', value: 'linear-gradient(135deg, #311054 0%, #080210 100%)' },
      { name: 'Dark Rose', value: 'linear-gradient(135deg, #440a1d 0%, #050106 100%)' },
      { name: 'Warm Amber', value: 'radial-gradient(circle, rgba(217,119,6,0.15) 0%, #050505 85%)' },
      { name: 'Vapor Wave', value: 'linear-gradient(135deg, #0d383b 0%, #2f083a 100%)' },
      { name: 'Obsidian Slate', value: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' },
      { name: 'Midnight Aurora', value: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #050505 100%)' },
      { name: 'Charcoal Minimal', value: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)' },
      { name: 'Clean Light Grey', value: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' },
      { name: 'Soft Light Blue', value: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' },
      { name: 'Soft Mint Frost', value: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' },
      { name: 'Warm Sunset Aura', value: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }
    ]
  };

  const themeTokenPresetsData = {
    aurora: {
      name: 'Aurora Glass',
      tokens: {
        '--color-bg-base': '#07111f',
        '--color-bg-surface': '#0e1b2f',
        '--color-bg-surface-glass': 'rgba(14, 27, 47, 0.78)',
        '--color-primary': '#5eead4',
        '--color-primary-rgb': '94, 234, 212',
        '--color-secondary': '#a78bfa',
        '--color-secondary-rgb': '167, 139, 250',
        '--color-tertiary': '#fbbf24',
        '--color-text-primary': '#f8fafc',
        '--color-text-muted': '#94a3b8'
      }
    },
    paper: {
      name: 'Paper Signal',
      tokens: {
        '--color-bg-base': '#f8fafc',
        '--color-bg-surface': '#ffffff',
        '--color-bg-surface-glass': 'rgba(255, 255, 255, 0.9)',
        '--color-primary': '#0f766e',
        '--color-primary-rgb': '15, 118, 110',
        '--color-secondary': '#7c3aed',
        '--color-secondary-rgb': '124, 58, 237',
        '--color-tertiary': '#b45309',
        '--color-text-primary': '#0f172a',
        '--color-text-muted': '#475569'
      }
    }
  };

  return {
    wallpaperPresetsData,
    themeTokenPresetsData
  };
});
