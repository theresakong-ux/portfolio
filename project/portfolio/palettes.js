/* palettes.js — 60:30:10 color systems. Red (#D35555) stays the 10% accent
   across every palette; the 60% surface and 30% anchor change to make the red
   feel intentional rather than stranded. */
(function () {
  // each: name, c60 (surface), c30 (anchor), c10 (accent=red family),
  // ink, ink-soft, ink-faint, on-deep, on-deep-soft
  const P = {
    conservatory: {
      label: 'Conservatory', swatch: ['#f1ede3', '#1e3a30', '#d35555'],
      vars: {
        '--c60': '#f1ede3', '--c30': '#1e3a30', '--c10': '#d35555',
        '--ink': '#1b2520', '--ink-soft': '#5f6b63', '--ink-faint': '#a9b0a8',
        '--on-deep': '#ece6d7', '--on-deep-soft': '#9fb0a4',
      },
    },
    nocturne: {
      label: 'Nocturne', swatch: ['#eceae3', '#1a2438', '#e0604f'],
      vars: {
        '--c60': '#eceae3', '--c30': '#1a2438', '--c10': '#e0604f',
        '--ink': '#1c2230', '--ink-soft': '#5e6678', '--ink-faint': '#aab',
        '--on-deep': '#e8e6df', '--on-deep-soft': '#9aa1b6',
      },
    },
    orchard: {
      label: 'Orchard', swatch: ['#f1e8e6', '#34233b', '#d6504f'],
      vars: {
        '--c60': '#f1e8e6', '--c30': '#34233b', '--c10': '#d6504f',
        '--ink': '#2a2030', '--ink-soft': '#6d6070', '--ink-faint': '#b6a9b4',
        '--on-deep': '#efe6e8', '--on-deep-soft': '#b39fb0',
      },
    },
    marine: {
      label: 'Marine', swatch: ['#e7ece9', '#0f3633', '#e8654d'],
      vars: {
        '--c60': '#e7ece9', '--c30': '#0f3633', '--c10': '#e8654d',
        '--ink': '#142420', '--ink-soft': '#566863', '--ink-faint': '#9fb2ac',
        '--on-deep': '#e3ece7', '--on-deep-soft': '#8fa9a2',
      },
    },
    ember: {
      label: 'Ember', swatch: ['#f3ecdd', '#2b2118', '#d8512f'],
      vars: {
        '--c60': '#f3ecdd', '--c30': '#2b2118', '--c10': '#d8512f',
        '--ink': '#231b12', '--ink-soft': '#6b6052', '--ink-faint': '#bcae99',
        '--on-deep': '#f0e7d6', '--on-deep-soft': '#b0a48f',
      },
    },
  };

  function apply(name) {
    const p = P[name] || P.conservatory;
    const root = document.documentElement;
    Object.entries(p.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.setAttribute('data-theme', name);
    window.dispatchEvent(new CustomEvent('tk-palette', { detail: name }));
  }

  // read resolved palette colors for canvas drawing
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue(k).trim();
    return { c60: g('--c60'), c30: g('--c30'), c10: g('--c10'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint') };
  }

  window.TK_PALETTES = P;
  window.TKapplyPalette = apply;
  window.TKcolors = colors;
})();
